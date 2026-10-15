// tests/components/signupScreens.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react')
  return {
    default: ({ href, children, ...rest }: { href: string; children?: ReactNode } & Record<string, unknown>) => h('a', { href, ...rest }, children),
  }
})

import SignupForm from '@/components/auth/SignupForm'
import SignupConfirmation from '@/components/auth/SignupConfirmation'
import { signupFormError } from '@/lib/access/signupForm'

describe('signupFormError', () => {
  it('checks the email, then the intention', () => {
    expect(signupFormError('', 'Pesquisa')).toBe('Informe o e-mail.')
    expect(signupFormError('fulana', 'Pesquisa')).toBe('Informe um e-mail válido.')
    expect(signupFormError('fulana@ufcg.edu.br', '   ')).toBe('Descreva como pretende usar a plataforma.')
    expect(signupFormError('fulana@ufcg.edu.br', 'Pesquisa')).toBeNull()
  })
})

describe('SignupForm', () => {
  it('asks for the email and the intention only, and says the password comes later', () => {
    const markup = renderToStaticMarkup(createElement(SignupForm))

    expect(markup).toMatch(/<h1[^>]*>Criar conta<\/h1>/)
    // React's server render emits `name` after the other input attributes, so the check ignores order.
    expect(markup).toMatch(/<input(?=[^>]*name="email")(?=[^>]*placeholder="de preferência institucional")/)
    expect(markup).toMatch(/<textarea[^>]*name="intention"[^>]*maxLength="1000"/)
    expect(markup).toContain('Como pretende usar a plataforma?')
    expect(markup).toContain('Sua descrição é enviada à equipe da plataforma, que libera o acesso.')
    expect(markup).toContain('Você escolhe sua senha ao confirmar o e-mail.')
    expect(markup).not.toContain('type="password"')
    expect(markup).toContain('href="/login"')
  })
})

describe('SignupConfirmation', () => {
  it('starts by checking the link', () => {
    const markup = renderToStaticMarkup(createElement(SignupConfirmation, { code: 'C0DE', email: 'fulana@ufcg.edu.br' }))
    expect(markup).toContain('Verificando o link...')
    expect(markup).not.toContain('type="password"')
  })
})
