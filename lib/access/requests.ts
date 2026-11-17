import 'server-only'

import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import type { RequestTier } from '@/lib/access/claims'

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
  tier: RequestTier
  intention: string
  /** The inviting admin's email, for a request an invite opened. */
  invitedBy?: string | null
}

export interface AccessRequest extends AccessRequestInput {
  status: AccessRequestStatus
  createdAt: string
  decidedAt: string | null
  /** The admin's email, or null when the domain rule decided. */
  decidedBy: string | null
  /** When the team was emailed; claimed in a transaction so concurrent opens send one email. */
  notifiedAt: string | null
  /** The admin whose invite opened or took over this request; absent on requests from before invites. */
  invitedBy?: string | null
  /** The latest invite; createdAt is not it when an invite took over an earlier signup. */
  invitedAt?: string | null
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

function newRequest({ email, tier, intention, invitedBy = null }: AccessRequestInput, now = nowIso()): AccessRequest {
  return {
    email, tier, intention, status: 'pending', createdAt: now, decidedAt: null, decidedBy: null, notifiedAt: null,
    invitedBy, invitedAt: invitedBy ? now : null,
  }
}

export async function createAccessRequest(uid: string, input: AccessRequestInput) {
  await requestDoc(uid).set(newRequest(input))
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
  | { claimed: true; tier: RequestTier }
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

interface InviteRecord {
  email: string
  invitedBy: string
}

/**
 * An invite to an address that has not confirmed it yet: the request becomes (or is opened as) a
 * pending invite, so the confirmation grants access without the queue (lib/access/settlement.ts).
 * Whatever was decided before is cleared, a rejection included: inviting is a new decision. The
 * intention of a signup the person started on their own is kept.
 */
export async function recordPendingInvite(uid: string, { email, invitedBy }: InviteRecord) {
  const doc = requestDoc(uid)
  await getFirebaseAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(doc)
    const now = nowIso()
    if (!snapshot.exists) {
      transaction.set(doc, newRequest({ email, tier: 'invited', intention: '', invitedBy }, now))
      return
    }
    transaction.update(doc, {
      tier: 'invited', status: 'pending', decidedAt: null, decidedBy: null, invitedBy, invitedAt: now,
    })
  })
}

export type InviteApproval =
  /** This invite approved the request: the caller grants access and emails the person. */
  | { decided: true; tier: RequestTier }
  /** Approved already (another admin from the table, or a grant that failed): grant again, email nothing. */
  | { decided: false; tier: RequestTier }

/**
 * An invite to an address already confirmed: approved on the spot, by the inviting admin. In a
 * transaction, like claimPendingDecision, so an admin approving the same request from the table at
 * the same moment does not make the person get two emails.
 */
export async function recordInviteApproval(uid: string, { email, invitedBy }: InviteRecord): Promise<InviteApproval> {
  const doc = requestDoc(uid)
  return getFirebaseAdminDb().runTransaction(async (transaction): Promise<InviteApproval> => {
    const snapshot = await transaction.get(doc)
    const now = nowIso()
    const decision = { status: 'approved' as const, decidedBy: invitedBy, decidedAt: now, invitedBy, invitedAt: now }

    if (!snapshot.exists) {
      // A confirmed account whose signup failed before recording the request.
      transaction.set(doc, { ...newRequest({ email, tier: 'invited', intention: '', invitedBy }, now), ...decision })
      return { decided: true, tier: 'invited' }
    }

    const current = snapshot.data() as AccessRequest
    if (current.status === 'approved') return { decided: false, tier: current.tier }

    transaction.update(doc, { ...decision, tier: 'invited' })
    return { decided: true, tier: 'invited' }
  })
}
