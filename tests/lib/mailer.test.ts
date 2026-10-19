import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), createTransport: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }))

import { escapeHtml, isMailerConfigured, resetMailer, sendMail } from '@/lib/mailer'

const message = { to: 'fulana@ufcg.edu.br', subject: 'Assunto', html: '<p>corpo</p>', text: 'corpo com link https://x/?code=SECRET' }

beforeEach(() => {
  vi.resetAllMocks()
  resetMailer()
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail })
  mocks.sendMail.mockResolvedValue({})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendMail', () => {
  it('logs instead of sending without credentials, and keeps the body out of the log', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASSWORD', '')
    vi.stubEnv('MAIL_LOG_BODY', '')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    expect(await sendMail(message)).toEqual({ delivered: false })
    expect(mocks.createTransport).not.toHaveBeenCalled()
    expect(info.mock.calls.flat().join(' ')).not.toContain('SECRET')
  })

  it('logs the unsent email as an error in production', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('NODE_ENV', 'production')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await sendMail(message)

    expect(error).toHaveBeenCalledOnce()
  })

  it('prints the body only with MAIL_LOG_BODY=true', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('MAIL_LOG_BODY', 'true')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    await sendMail(message)

    expect(info.mock.calls.flat().join(' ')).toContain('SECRET')
  })

  it('sends through Gmail SMTP from SMTP_FROM, or from SMTP_USER', async () => {
    vi.stubEnv('SMTP_USER', 'plataforma@gmail.com')
    vi.stubEnv('SMTP_PASSWORD', 'app-password')
    vi.stubEnv('SMTP_FROM', '')
    expect(isMailerConfigured()).toBe(true)

    expect(await sendMail(message)).toEqual({ delivered: true })
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com', port: 465, secure: true }))
    expect(mocks.sendMail).toHaveBeenCalledWith({ ...message, from: 'plataforma@gmail.com' })
  })
})

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})
