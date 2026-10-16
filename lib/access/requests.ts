import 'server-only'

import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import type { SignupTier } from '@/lib/access/domains'

/**
 * The audit trail of signup: one document per account (the id is the uid), with who asked, what
 * they wrote, who decided and when. It never authorizes: the access claim does
 * (lib/access/claims.ts), read from the session cookie without a database read. It outlives the
 * decision: it is what answers "who let this person in, and when" months later.
 */

export const DEFAULT_ACCESS_REQUESTS_COLLECTION = 'access-requests-local'

/**
 * Beta and prod set `access-requests`; the default keeps local test signups out of it. Forgetting
 * the variable in production creates a visibly empty collection, which is better than forgetting
 * it locally and mixing test signups into production's approvals page.
 */
export function accessRequestsCollectionName(value = process.env.FIREBASE_ACCESS_REQUESTS_COLLECTION): string {
  return value?.trim() || DEFAULT_ACCESS_REQUESTS_COLLECTION
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'
export type AccessDecisionStatus = Exclude<AccessRequestStatus, 'pending'>

export interface AccessRequestInput {
  email: string
  tier: SignupTier
  intention: string
}

export interface AccessRequest extends AccessRequestInput {
  status: AccessRequestStatus
  createdAt: string
  decidedAt: string | null
  /** The admin's email, or null when the domain rule decided. */
  decidedBy: string | null
  /** When the team was emailed; claimed in a transaction so concurrent opens send one email. */
  notifiedAt: string | null
}

export interface PendingAccessRequest extends AccessRequest {
  uid: string
}

export interface AccessDecision {
  status: AccessDecisionStatus
  decidedBy: string | null
}

function requestDoc(uid: string) {
  return getFirebaseAdminDb().collection(accessRequestsCollectionName()).doc(uid)
}

const nowIso = () => new Date().toISOString()

export async function createAccessRequest(uid: string, { email, tier, intention }: AccessRequestInput) {
  const request: AccessRequest = {
    email, tier, intention, status: 'pending', createdAt: nowIso(), decidedAt: null, decidedBy: null, notifiedAt: null,
  }
  await requestDoc(uid).set(request)
}

export async function readAccessRequest(uid: string): Promise<AccessRequest | null> {
  const snapshot = await requestDoc(uid).get()
  return snapshot.exists ? ((snapshot.data() as AccessRequest | undefined) ?? null) : null
}

/** How many accounts getUsers accepts per call. */
const GET_USERS_BATCH_SIZE = 100

/** Of the given accounts, those whose email Firebase says is confirmed; deleted accounts drop out too. */
async function confirmedUids(uids: string[]): Promise<Set<string>> {
  const confirmed = new Set<string>()
  for (let start = 0; start < uids.length; start += GET_USERS_BATCH_SIZE) {
    const batch = uids.slice(start, start + GET_USERS_BATCH_SIZE).map((uid) => ({ uid }))
    const { users } = await getFirebaseAdminAuth().getUsers(batch)
    for (const user of users) if (user.emailVerified) confirmed.add(user.uid)
  }
  return confirmed
}

/**
 * What the approvals page lists: pending requests whose email is confirmed, oldest first. Without
 * the confirmation filter an admin could approve an address nobody proved to own. The query needs
 * the composite index in firestore.indexes.json.
 */
export async function listPendingAccessRequests(): Promise<PendingAccessRequest[]> {
  const snapshot = await getFirebaseAdminDb()
    .collection(accessRequestsCollectionName())
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .get()
  const requests = snapshot.docs.map((doc) => ({ uid: doc.id, ...(doc.data() as AccessRequest) }))
  if (requests.length === 0) return requests

  const confirmed = await confirmedUids(requests.map((request) => request.uid))
  return requests.filter((request) => confirmed.has(request.uid))
}

/**
 * Takes the right to email the team, in a transaction. The confirmation can run more than once at
 * the same time (a double click, a retry); reading notifiedAt and writing it separately let two of
 * them both send. True for the one that won.
 */
export async function claimTeamNotification(uid: string): Promise<boolean> {
  const doc = requestDoc(uid)
  return getFirebaseAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(doc)
    if (!snapshot.exists || (snapshot.data() as AccessRequest).notifiedAt) return false
    transaction.update(doc, { notifiedAt: nowIso() })
    return true
  })
}

export type DecisionClaim =
  | { claimed: true; tier: SignupTier }
  | { claimed: false; status: AccessRequestStatus | 'missing' }

/**
 * Takes the right to decide a request, in a transaction: two admins on the page at once would
 * otherwise both pass the "still pending" check, and one approving while the other rejects would
 * leave access granted with a record saying it was denied. Returns the stored tier, because the
 * caller grants access with it and it must never come from the page.
 */
export async function claimPendingDecision(uid: string, { status, decidedBy }: AccessDecision): Promise<DecisionClaim> {
  const doc = requestDoc(uid)
  return getFirebaseAdminDb().runTransaction(async (transaction): Promise<DecisionClaim> => {
    const snapshot = await transaction.get(doc)
    if (!snapshot.exists) return { claimed: false, status: 'missing' }

    const current = snapshot.data() as AccessRequest
    if (current.status !== 'pending') return { claimed: false, status: current.status }

    transaction.update(doc, { status, decidedBy, decidedAt: nowIso() })
    return { claimed: true, tier: current.tier }
  })
}

/** Closes a request without a transaction: used when the domain rule decides, with nobody to race. */
export async function recordAccessDecision(uid: string, { status, decidedBy }: AccessDecision) {
  await requestDoc(uid).update({ status, decidedBy, decidedAt: nowIso() })
}
