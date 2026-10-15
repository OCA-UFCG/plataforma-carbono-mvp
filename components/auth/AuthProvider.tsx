'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Auth, User } from 'firebase/auth'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { readAccessCode, type AccessCode } from '@/lib/access/sessionCodes'

/** `pending`: a correct password waiting for access; `unconfirmed`: the address is not confirmed. */
export type SignInOutcome = 'ok' | 'pending' | 'unconfirmed'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInOutcome>
  signOut: () => Promise<void>
}

async function postSession(idToken: string): Promise<'ok' | AccessCode | 'failed'> {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (response.ok) return 'ok'
    return readAccessCode(await response.json().catch(() => null)) ?? 'failed'
  } catch {
    return 'failed'
  }
}

async function signInAndPostSession(auth: Auth, email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return postSession(await credential.user.getIdToken())
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  async function signIn(email: string, password: string): Promise<SignInOutcome> {
    const auth = getFirebaseAuth()
    let result = await signInAndPostSession(auth, email, password)
    // access_granted: the first token predates the claim just granted; a fresh sign-in mints one
    // that carries it. Once, never more.
    if (result === 'access_granted') result = await signInAndPostSession(auth, email, password)
    if (result === 'ok') return 'ok'

    await firebaseSignOut(auth)
    if (result === 'access_pending' || result === 'access_granted') return 'pending'
    if (result === 'email_unconfirmed') return 'unconfirmed'

    await fetch('/api/session', { method: 'DELETE' })
    throw new Error('Could not create the session.')
  }

  async function signOut() {
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } finally {
      await firebaseSignOut(getFirebaseAuth())
    }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
