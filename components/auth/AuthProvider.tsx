'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
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

  async function signIn(email: string, password: string) {
    const auth = getFirebaseAuth()
    const credential = await signInWithEmailAndPassword(auth, email, password)

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      })
      if (!response.ok) throw new Error('Could not create the session.')
    } catch (error) {
      await fetch('/api/session', { method: 'DELETE' })
      await firebaseSignOut(auth)
      throw error
    }
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
