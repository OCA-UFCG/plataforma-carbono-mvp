import { describe, expect, it } from 'vitest'
import { readAccessCode } from '@/lib/access/sessionCodes'
import { loginErrorMessage } from '@/lib/access/loginErrors'

describe('readAccessCode', () => {
  it('reads the three codes and nothing else', () => {
    expect(readAccessCode({ code: 'access_pending' })).toBe('access_pending')
    expect(readAccessCode({ code: 'access_granted' })).toBe('access_granted')
    expect(readAccessCode({ code: 'email_unconfirmed' })).toBe('email_unconfirmed')
    expect(readAccessCode({ code: 'other' })).toBeNull()
    expect(readAccessCode(null)).toBeNull()
    expect(readAccessCode('access_pending')).toBeNull()
  })
})

describe('loginErrorMessage', () => {
  it('names throttling and a disabled account, and keeps the generic message otherwise', () => {
    expect(loginErrorMessage({ code: 'auth/too-many-requests' })).toBe('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
    expect(loginErrorMessage({ code: 'auth/user-disabled' })).toBe('Esta conta não tem acesso à plataforma.')
    expect(loginErrorMessage({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha inválidos.')
    expect(loginErrorMessage(new Error('boom'))).toBe('E-mail ou senha inválidos.')
  })
})
