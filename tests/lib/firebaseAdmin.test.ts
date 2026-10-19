import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Firebase Admin accessors', () => {
  it('refuse to start without the service account', () => {
    vi.stubEnv('FIREBASE_PROJECT_ID', '')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('FIREBASE_CLIENT_EMAIL', '')
    vi.stubEnv('FIREBASE_PRIVATE_KEY', '')
    vi.stubEnv('FIREBASE_PRIVATE_KEY_BASE64', '')

    expect(() => getFirebaseAdminAuth()).toThrow('Firebase Admin configuration is incomplete.')
    expect(() => getFirebaseAdminDb()).toThrow('Firebase Admin configuration is incomplete.')
  })
})
