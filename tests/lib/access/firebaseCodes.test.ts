import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyVerificationCode, checkActionCode, extractOobCode, resetPasswordWithCode } from '@/lib/access/firebaseCodes'

const fetchMock = vi.fn<typeof fetch>()

function toolkitResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function lastCall() {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was not called')
  const [url, init] = call
  return { url: String(url), body: JSON.parse(String(init?.body)) as Record<string, string> }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'public-key')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('extractOobCode', () => {
  it('reads the code out of a Firebase action link', () => {
    expect(extractOobCode('https://p.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=C0DE&apiKey=k')).toBe('C0DE')
    expect(extractOobCode('not a url')).toBeNull()
  })
})

describe('checkActionCode', () => {
  it('returns the lowercased email of a valid code of the expected type, through resetPassword without a password', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'Fulana@UFCG.edu.br', requestType: 'VERIFY_EMAIL' }))

    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBe('fulana@ufcg.edu.br')
    expect(lastCall()).toEqual({
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=public-key',
      body: { oobCode: 'C0DE' },
    })
  })

  it('refuses a code of another type', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'a@b.co', requestType: 'VERIFY_EMAIL' }))
    expect(await checkActionCode('C0DE', 'PASSWORD_RESET')).toBeNull()
  })

  it('returns null for an invalid code, an unreachable Firebase or a missing API key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'INVALID_OOB_CODE' } }))
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()

    fetchMock.mockRejectedValueOnce(new Error('network'))
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()

    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '')
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('applyVerificationCode', () => {
  it('applies the code through accounts:update and returns the email it confirmed', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'fulana@ufcg.edu.br', emailVerified: true }))

    expect(await applyVerificationCode('C0DE')).toBe('fulana@ufcg.edu.br')
    expect(lastCall()).toEqual({
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:update?key=public-key',
      body: { oobCode: 'C0DE' },
    })
  })

  it('returns null when the code does not apply', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'EXPIRED_OOB_CODE' } }))
    expect(await applyVerificationCode('C0DE')).toBeNull()
  })
})

describe('resetPasswordWithCode', () => {
  it('changes the password and returns the account email', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'fulana@ufcg.edu.br', requestType: 'PASSWORD_RESET' }))

    expect(await resetPasswordWithCode('C0DE', 'nova-senha-123')).toEqual({ status: 'changed', email: 'fulana@ufcg.edu.br' })
    expect(lastCall().body).toEqual({ oobCode: 'C0DE', newPassword: 'nova-senha-123' })
  })

  it('tells an invalid code from a weak password from anything else, without logging the password', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'EXPIRED_OOB_CODE' } }))
    expect(await resetPasswordWithCode('C0DE', 'x')).toEqual({ status: 'invalid-code' })

    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS : Missing password requirements' } }))
    expect(await resetPasswordWithCode('C0DE', 'x')).toEqual({ status: 'weak-password' })

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'OPERATION_NOT_ALLOWED' } }))
    expect(await resetPasswordWithCode('C0DE', 'segredo-123')).toEqual({ status: 'failed' })
    expect(error.mock.calls.flat().join(' ')).not.toContain('segredo-123')
  })
})
