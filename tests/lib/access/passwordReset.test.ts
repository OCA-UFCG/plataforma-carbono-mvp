import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUserByEmail: vi.fn(), generatePasswordResetLink: vi.fn(), sendMail: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, generatePasswordResetLink: mocks.generatePasswordResetLink }),
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { sendPasswordResetEmail } from '@/lib/access/passwordReset'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.generatePasswordResetLink.mockResolvedValue('https://p.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=R3SET')
  mocks.sendMail.mockResolvedValue({ delivered: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendPasswordResetEmail', () => {
  it('sends our own reset link to an existing account', async () => {
    expect(await sendPasswordResetEmail('fulana@ufcg.edu.br')).toBe(true)
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('fulana@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/redefinir-senha?code=R3SET')
  })

  it('does nothing, quietly, for an unknown address', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getUserByEmail.mockRejectedValueOnce(Object.assign(new Error('none'), { code: 'auth/user-not-found' }))

    expect(await sendPasswordResetEmail('ninguem@ufcg.edu.br')).toBe(false)
    expect(mocks.generatePasswordResetLink).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('logs a failure without the code', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockRejectedValueOnce(new Error('rejected message with R3SET inside'))

    expect(await sendPasswordResetEmail('fulana@ufcg.edu.br')).toBe(false)
    expect(error.mock.calls.flat().join(' ')).not.toContain('R3SET')
  })
})
