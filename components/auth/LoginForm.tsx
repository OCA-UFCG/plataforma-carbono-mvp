'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

function loginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return 'E-mail ou senha inválidos.'
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) return

    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
      router.replace(redirectTo)
      router.refresh()
    } catch (cause) {
      setError(loginErrorMessage(cause))
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(140deg, #20281d 0%, #3d482c 48%, #c5813e 160%)' }}>
      <section style={{ width: 'min(100%, 420px)', padding: '40px', borderRadius: 20, background: '#fffdf7', boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}>
        <div aria-label="Carbono Caatinga" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#26241d', fontWeight: 800 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, background: '#5f7030', color: '#fff' }}>O</span>
          Carbono Caatinga
        </div>
        <h1 style={{ margin: '36px 0 8px', color: '#26241d', fontSize: 28, lineHeight: 1.15 }}>Acesse os mapas</h1>
        <p style={{ margin: '0 0 28px', color: '#6b6a60', fontSize: 15, lineHeight: 1.5 }}>Entre com as credenciais fornecidas pela equipe da plataforma.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <label style={{ display: 'grid', gap: 7, color: '#39382f', fontSize: 13, fontWeight: 700 }}>
            E-mail
            <input name="email" type="email" autoComplete="username" required disabled={submitting} style={{ boxSizing: 'border-box', width: '100%', border: '1px solid #cfcbbd', borderRadius: 9, padding: '12px 13px', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 7, color: '#39382f', fontSize: 13, fontWeight: 700 }}>
            Senha
            <input name="password" type="password" autoComplete="current-password" required disabled={submitting} style={{ boxSizing: 'border-box', width: '100%', border: '1px solid #cfcbbd', borderRadius: 9, padding: '12px 13px', font: 'inherit' }} />
          </label>
          {error && <p role="alert" style={{ margin: 0, color: '#a12b22', fontSize: 13, lineHeight: 1.4 }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{ border: 0, borderRadius: 9, padding: '13px 16px', background: '#5f7030', color: '#fff', cursor: submitting ? 'wait' : 'pointer', font: 'inherit', fontWeight: 800, opacity: submitting ? .7 : 1 }}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
