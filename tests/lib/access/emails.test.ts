import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDecisionEmail, buildNewRequestEmail, buildPasswordResetEmail, buildVerificationEmail } from '@/lib/access/emails'
import { approvalsUrl, loginUrl, passwordResetUrl, signupConfirmationUrl } from '@/lib/access/urls'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('email links', () => {
  it('builds absolute links from APP_BASE_URL, without a doubled slash', () => {
    vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org/')
    expect(signupConfirmationUrl('C0DE', 'fulana@ufcg.edu.br'))
      .toBe('https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br')
    expect(passwordResetUrl('C0DE')).toBe('https://caativar.example.org/redefinir-senha?code=C0DE')
    expect(approvalsUrl()).toBe('https://caativar.example.org/aprovacoes')
    expect(loginUrl()).toBe('https://caativar.example.org/login')
  })

  it('falls back to the dev server in development and logs an error in production', () => {
    vi.stubEnv('APP_BASE_URL', '')
    expect(loginUrl()).toBe('http://localhost:3000/login')
    vi.stubEnv('NODE_ENV', 'production')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(loginUrl()).toBe('/login')
    expect(error).toHaveBeenCalledOnce()
  })
})

const LINK = 'https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br'
const FOOTER = 'Caativar — monitoramento do carbono florestal da Caatinga'

describe('confirmation email', () => {
  it('carries the link under the button and in the text part, and says to ignore an unknown signup', () => {
    const email = buildVerificationEmail({ link: LINK })
    expect(email.subject).toBe('Confirme seu endereço de e-mail — Caativar')
    expect(email.html).toContain(`href="${LINK.replace('&', '&amp;')}"`)
    expect(email.html).toContain('Confirmar e escolher senha')
    expect(email.html).toContain('Se o botão não funcionar, copie este endereço no navegador:')
    expect(email.text).toContain(LINK)
    expect(email.text).toContain('Se você não fez este cadastro, ignore este e-mail.')
    expect(email.text).toContain(FOOTER)
  })
})

describe('new request email', () => {
  it('escapes what a stranger typed', () => {
    const email = buildNewRequestEmail({
      email: 'x"><script>@evil.co',
      intention: '<img src=x onerror=alert(1)>\nPesquisa',
      approvalUrl: 'https://caativar.example.org/aprovacoes',
    })
    expect(email.subject).toBe('Novo pedido de acesso à Caativar')
    expect(email.html).not.toContain('<script>')
    expect(email.html).not.toContain('<img')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(email.text).toContain('<img src=x onerror=alert(1)>')
    expect(email.html).toContain('href="https://caativar.example.org/aprovacoes"')
  })

  it('says when the intention was lost', () => {
    expect(buildNewRequestEmail({ email: 'a@b.co', intention: '', approvalUrl: 'u' }).text).toContain('(não informada)')
  })
})

describe('decision email', () => {
  it('links the login on approval and links nothing on rejection', () => {
    const approved = buildDecisionEmail({ status: 'approved', loginUrl: 'https://caativar.example.org/login' })
    expect(approved.subject).toBe('Seu acesso à Caativar foi liberado')
    expect(approved.html).toContain('href="https://caativar.example.org/login"')
    expect(approved.html).toContain('Entrar na Caativar')

    const rejected = buildDecisionEmail({ status: 'rejected', loginUrl: 'https://caativar.example.org/login' })
    expect(rejected.subject).toBe('Sobre seu pedido de acesso à Caativar')
    expect(rejected.html).not.toContain('href=')
    expect(rejected.text).not.toContain('https://')
  })
})

describe('password reset email', () => {
  it('carries the link and tells whoever did not ask to ignore it', () => {
    const email = buildPasswordResetEmail({ link: 'https://caativar.example.org/redefinir-senha?code=C0DE' })
    expect(email.subject).toBe('Redefina sua senha — Caativar')
    expect(email.text).toContain('https://caativar.example.org/redefinir-senha?code=C0DE')
    expect(email.text).toContain('Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.')
  })
})
