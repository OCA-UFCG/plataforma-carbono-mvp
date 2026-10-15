import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ generateEmailVerificationLink: vi.fn(), sendMail: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ generateEmailVerificationLink: mocks.generateEmailVerificationLink }),
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { describeWithoutLink, sendVerificationEmail } from '@/lib/access/verification'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  mocks.generateEmailVerificationLink.mockResolvedValue('https://p.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=C0DE')
  mocks.sendMail.mockResolvedValue({ delivered: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendVerificationEmail', () => {
  it('sends our own confirmation link, carrying only the code and the address', async () => {
    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(true)
    expect(mocks.generateEmailVerificationLink).toHaveBeenCalledWith('fulana@ufcg.edu.br')
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('fulana@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br')
    expect(message.text).not.toContain('firebaseapp.com')
  })

  it('reports an unconfigured mailer as not delivered', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockResolvedValueOnce({ delivered: false })
    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(false)
  })

  it('returns false on failure and keeps the code out of the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockRejectedValueOnce(new Error('SMTP said no to a message with code=C0DE'))

    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(false)
    expect(error.mock.calls.flat().join(' ')).not.toContain('C0DE')
  })
})

describe('describeWithoutLink', () => {
  it('cuts every copy of the code out of the message', () => {
    expect(describeWithoutLink(new Error('a C0DE b C0DE'), 'C0DE')).toBe('a [code omitted] b [code omitted]')
    expect(describeWithoutLink('not an error', null)).toBe('unknown error')
  })
})
