// tests/lib/access/accessRules.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAccessGuardEnabled, isSignupOpen } from '@/lib/access/flag'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { emailDomain, parseAllowedSignupDomains, resolveSignupTier } from '@/lib/access/domains'
import { isAccessAdmin, parseAccessAdminEmails } from '@/lib/access/admins'
import { MIN_PASSWORD_LENGTH, isAcceptablePassword, passwordPairError } from '@/lib/access/passwordRules'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the access switch', () => {
  it('is on only when the variable is exactly "true"', () => {
    for (const value of ['', 'false', 'TRUE', '1', ' true']) {
      vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', value)
      expect(isAccessGuardEnabled()).toBe(false)
    }
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(isAccessGuardEnabled()).toBe(true)
  })

  it('opens signup exactly when the gate is on', () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect(isSignupOpen()).toBe(false)
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(isSignupOpen()).toBe(true)
  })
})

describe('email addresses', () => {
  it('normalizes to trimmed lowercase, and anything but a string to ""', () => {
    expect(normalizeEmail('  Fulana@UFCG.edu.BR ')).toBe('fulana@ufcg.edu.br')
    expect(normalizeEmail(42)).toBe('')
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('accepts one @ with a dotted domain and nothing blank', () => {
    expect(isWellFormedEmail('fulana@ufcg.edu.br')).toBe(true)
    for (const bad of ['', 'fulana', 'fulana@', '@ufcg.edu.br', 'fulana@ufcg', 'ful ana@ufcg.edu.br', 'a@b@c.br']) {
      expect(isWellFormedEmail(bad)).toBe(false)
    }
  })
})

describe('signup domains', () => {
  it('parses a comma list, with or without @, ignoring blanks and case', () => {
    expect(parseAllowedSignupDomains(' UFCG.edu.br, @insa.gov.br ,,')).toEqual(new Set(['ufcg.edu.br', 'insa.gov.br']))
    expect(parseAllowedSignupDomains('')).toEqual(new Set())
  })

  it('takes the domain of a single well-formed address only', () => {
    expect(emailDomain('Fulana@UFCG.edu.br')).toBe('ufcg.edu.br')
    expect(emailDomain('fulana')).toBeNull()
    expect(emailDomain('a@b@ufcg.edu.br')).toBeNull()
    expect(emailDomain('@ufcg.edu.br')).toBeNull()
    expect(emailDomain(null)).toBeNull()
  })

  it('admits a listed domain by exact match, never by suffix, whatever the case and spacing', () => {
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
    expect(resolveSignupTier('fulana@ufcg.edu.br')).toBe('allowed')
    expect(resolveSignupTier('  Fulana@UFCG.EDU.BR ')).toBe('allowed')
    expect(resolveSignupTier('fulana@ccc.ufcg.edu.br')).toBe('common')
    expect(resolveSignupTier('fulana@naoufcg.edu.br')).toBe('common')
    expect(resolveSignupTier('fulana@gmail.com')).toBe('common')
  })

  it('sends everyone to approval when the list is empty or the address is malformed', () => {
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', '')
    expect(resolveSignupTier('fulana@ufcg.edu.br')).toBe('common')
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
    expect(resolveSignupTier('fulana@ufcg.edu.br@gmail.com')).toBe('common')
  })
})

describe('access admins', () => {
  it('matches a listed email regardless of case and spacing', () => {
    vi.stubEnv('ACCESS_ADMIN_EMAILS', ' Admin@UFCG.edu.br , outra@insa.gov.br')
    expect(parseAccessAdminEmails()).toEqual(new Set(['admin@ufcg.edu.br', 'outra@insa.gov.br']))
    expect(isAccessAdmin('admin@ufcg.edu.br')).toBe(true)
    expect(isAccessAdmin('ADMIN@ufcg.edu.br')).toBe(true)
    expect(isAccessAdmin('fulana@ufcg.edu.br')).toBe(false)
  })

  it('admits nobody when the list is empty or the email is missing', () => {
    vi.stubEnv('ACCESS_ADMIN_EMAILS', '')
    expect(isAccessAdmin('admin@ufcg.edu.br')).toBe(false)
    vi.stubEnv('ACCESS_ADMIN_EMAILS', 'admin@ufcg.edu.br')
    expect(isAccessAdmin(undefined)).toBe(false)
    expect(isAccessAdmin('')).toBe(false)
  })
})

describe('password rules', () => {
  it('checks the pair in the order the person fills it in', () => {
    expect(passwordPairError('', '')).toBe('required')
    expect(passwordPairError('1234567', '1234567')).toBe('too-short')
    expect(passwordPairError('12345678', '')).toBe('confirm-required')
    expect(passwordPairError('12345678', '12345679')).toBe('mismatch')
    expect(passwordPairError('12345678', '12345678')).toBeNull()
  })

  it('accepts on the server only a string of at least the minimum length', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(isAcceptablePassword('12345678')).toBe(true)
    expect(isAcceptablePassword('1234567')).toBe(false)
    expect(isAcceptablePassword(12345678)).toBe(false)
    expect(isAcceptablePassword(undefined)).toBe(false)
  })
})
