import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * The only module that talks to the world outside the platform: confirm your address, a new
 * access request, a decision, a password reset.
 *
 * Sent through Google's SMTP with an app password of the sending account (SMTP_USER), whose domain
 * already has SPF and DKIM, so the mail reaches the inbox without DNS work. Switching to a sending
 * service changes this file and no other.
 */

const SMTP_HOST = 'smtp.gmail.com'
const SMTP_PORT = 465

export interface MailMessage {
  to: string
  subject: string
  html: string
  /** Always present: clients without HTML need it, and leaving it out raises the spam score. */
  text: string
}

let transporter: Transporter | null = null

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  return transporter
}

/** Lets a test swap credentials between cases. */
export function resetMailer() {
  transporter = null
}

/** Text from outside (an address, the intention) enters an HTML email as text, never as markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Without credentials, logs instead of sending: that keeps local development working without an
 * app password. In production the same line is an error, because signup then answers success and
 * nobody ever receives anything.
 *
 * The body is NOT logged by default: it carries the confirmation or reset link, a credential.
 * MAIL_LOG_BODY=true prints it, for local debugging only.
 */
export async function sendMail({ to, subject, html, text }: MailMessage): Promise<{ delivered: boolean }> {
  if (!isMailerConfigured()) {
    const announce = process.env.NODE_ENV === 'production' ? console.error : console.info
    announce(`[mailer] no SMTP credentials; email NOT sent — to: ${to} · subject: ${subject}`)
    if (process.env.MAIL_LOG_BODY === 'true') console.info(`[mailer] body:\n${text}`)
    return { delivered: false }
  }

  await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html, text })
  return { delivered: true }
}
