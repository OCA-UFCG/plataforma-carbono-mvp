import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react')
  return {
    default: ({ href, children, ...rest }: { href: string; children?: ReactNode } & Record<string, unknown>) => h('a', { href, ...rest }, children),
  }
})

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

describe('ForgotPasswordForm', () => {
  it('asks for the account email and links back to the login', () => {
    const markup = renderToStaticMarkup(createElement(ForgotPasswordForm))
    expect(markup).toMatch(/<h1[^>]*>Esqueci minha senha<\/h1>/)
    expect(markup).toContain('Informe o e-mail da sua conta. Enviaremos um link para escolher uma nova senha.')
    expect(markup).toMatch(/<input[^>]*name="email"/)
    expect(markup).toContain('Enviar link')
    expect(markup).toContain('href="/login"')
  })
})

describe('ResetPasswordForm', () => {
  it('starts by checking the link', () => {
    expect(renderToStaticMarkup(createElement(ResetPasswordForm, { code: 'R3SET' }))).toContain('Verificando o link...')
  })
})
