import 'server-only'

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getPrivateKey() {
  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64
  if (base64Key) return Buffer.from(base64Key, 'base64').toString('utf8')

  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

/** The one Admin app, created on first use from the service account. */
export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp()

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin configuration is incomplete.')
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}

/** Firestore, which holds only the access-request audit record (lib/access/requests.ts). */
export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp())
}
