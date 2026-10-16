import { APPROVALS_PATH, LOGIN_PATH, PASSWORD_RESET_PATH, SIGNUP_CONFIRMATION_PATH } from '@/lib/access/paths'

const DEVELOPMENT_BASE_URL = 'http://localhost:3000'

/**
 * The public origin for links inside emails: an inbox has no relative links. APP_BASE_URL is set
 * per environment; development falls back to the dev server, and production without it logs an
 * error, because every link it sends would be broken.
 */
export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    console.error('[access] APP_BASE_URL is not set: links in emails will be broken.')
    return ''
  }
  return DEVELOPMENT_BASE_URL
}

export function absoluteUrl(path: string): string {
  return `${appBaseUrl()}${path}`
}

/** The address rides along only to fill the page's resend button; the confirm route reads the email from the code. */
export function signupConfirmationUrl(code: string, email: string): string {
  return `${absoluteUrl(SIGNUP_CONFIRMATION_PATH)}?${new URLSearchParams({ code, email })}`
}

export function passwordResetUrl(code: string): string {
  return `${absoluteUrl(PASSWORD_RESET_PATH)}?${new URLSearchParams({ code })}`
}

export const approvalsUrl = () => absoluteUrl(APPROVALS_PATH)
export const loginUrl = () => absoluteUrl(LOGIN_PATH)
