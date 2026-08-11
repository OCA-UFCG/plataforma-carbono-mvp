import 'server-only'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getPrivateKey() {
  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64
  if (base64Key) return Buffer.from(base64Key, 'base64').toString('utf8')

  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

export function getFirebaseAdminAuth() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = getPrivateKey()

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin configuration is incomplete.')
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  }

  return getAuth()
}
