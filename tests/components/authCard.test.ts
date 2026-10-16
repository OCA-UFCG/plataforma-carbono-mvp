import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AuthCard from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES } from '@/components/auth/PasswordFields'

describe('AuthCard', () => {
  it('renders the Caativar mark, the title, the description and the content on the 420px card', () => {
    const markup = renderToStaticMarkup(
      createElement(AuthCard, { title: 'Criar conta', description: 'Texto' }, createElement('p', null, 'conteúdo')),
    )
    expect(markup).toContain('aria-label="Caativar"')
    expect(markup).toMatch(/<h1[^>]*>Criar conta<\/h1>/)
    expect(markup).toContain('Texto')
    expect(markup).toContain('conteúdo')
    expect(markup).toContain('min(100%, 420px)')
  })

  it('widens for the approvals panel', () => {
    expect(renderToStaticMarkup(createElement(AuthCard, { title: 'Pedidos de acesso', width: 960 }))).toContain('min(100%, 960px)')
  })
})

describe('PasswordFields', () => {
  it('renders the two password inputs the forms read, hidden by default', () => {
    const markup = renderToStaticMarkup(createElement(PasswordFields))
    // React renders an input's type first, so match the attributes in any order.
    expect(markup).toMatch(/<input(?=[^>]*name="password")(?=[^>]*type="password")[^>]*>/)
    expect(markup).toMatch(/<input(?=[^>]*name="confirmation")(?=[^>]*type="password")[^>]*>/)
    expect(markup).toContain('Senha')
    expect(markup).toContain('Confirmar senha')
    expect(markup).toContain('Mostrar senha')
  })

  it("takes the reset page's labels", () => {
    const markup = renderToStaticMarkup(createElement(PasswordFields, { labels: { password: 'Nova senha', confirmation: 'Confirmar nova senha' } }))
    expect(markup).toContain('Nova senha')
    expect(markup).toContain('Confirmar nova senha')
  })

  it('has a Portuguese message for every pair error', () => {
    expect(PASSWORD_PAIR_MESSAGES).toEqual({
      required: 'Informe a senha.',
      'too-short': 'A senha precisa de pelo menos 8 caracteres.',
      'confirm-required': 'Confirme a senha.',
      mismatch: 'As senhas não são iguais.',
    })
  })
})
