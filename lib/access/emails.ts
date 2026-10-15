import { escapeHtml, type MailMessage } from '@/lib/mailer'

/**
 * The messages the platform sends, in Portuguese. Rules that hold for every one, for a reason:
 * - inline CSS only: mail clients drop style sheets;
 * - no image the message depends on: many inboxes block images by default;
 * - the URL written out under every button, for whoever cannot see or distrusts the button;
 * - a plain-text part beside the HTML.
 * Colors from the login card (components/auth/AuthCard.tsx).
 */

export type EmailDraft = Omit<MailMessage, 'to'>

const INK = '#26241d'
const MUTED = '#6b6a60'
const ACCENT = '#5f7030'
const BORDER = '#e4dfcf'
const PAGE = '#f4f1e8'
const CARD = '#fffdf7'

const FALLBACK = 'Se o botão não funcionar, copie este endereço no navegador:'
const FOOTER = 'Caativar — monitoramento do carbono florestal da Caatinga'

function layout(title: string, body: string): string {
  return [
    `<div style="margin:0;padding:24px;background:${PAGE};font-family:Helvetica,Arial,sans-serif;color:${INK};">`,
    `<div style="max-width:520px;margin:0 auto;padding:28px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;">`,
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK};">${escapeHtml(title)}</h1>`,
    body,
    `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.5;color:${MUTED};">${escapeHtml(FOOTER)}</p>`,
    `</div></div>`,
  ].join('')
}

/** `content` is HTML: callers escape whatever came from outside. */
function paragraph(content: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${MUTED};">${content}</p>`
}

/** A smaller closing line, for "ignore this if it was not you". */
function note(content: string): string {
  return `<p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:${MUTED};">${escapeHtml(content)}</p>`
}

/** The button plus the URL written out right below it, never the button alone. */
function callToAction(label: string, url: string): string {
  const href = escapeHtml(url)
  return [
    `<p style="margin:22px 0 10px;">`,
    `<a href="${href}" style="display:inline-block;padding:11px 18px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:9px;">${escapeHtml(label)}</a>`,
    `</p>`,
    `<p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">${escapeHtml(FALLBACK)}<br>${href}</p>`,
  ].join('')
}

function plainText(...blocks: string[]): string {
  return [...blocks, FOOTER].join('\n\n')
}

export function buildVerificationEmail({ link }: { link: string }): EmailDraft {
  const title = 'Confirme seu endereço'
  const body = 'Recebemos um cadastro na Caativar, a plataforma de monitoramento do carbono florestal da Caatinga, com este endereço. Confirme que este e-mail pertence a você e escolha sua senha para continuar.'
  const ignore = 'Se você não fez este cadastro, ignore este e-mail.'

  return {
    subject: 'Confirme seu endereço de e-mail — Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + callToAction('Confirmar e escolher senha', link) + note(ignore)),
    text: plainText(title, body, link, ignore),
  }
}

/** Goes to the team's mailbox. The address and the intention were typed by a stranger. */
export function buildNewRequestEmail({ email, intention, approvalUrl }: {
  email: string
  intention: string
  approvalUrl: string
}): EmailDraft {
  const title = 'Novo pedido de acesso'
  const label = 'Intenção de uso descrita no cadastro:'
  // Empty when settlement had to open a request the signup failed to record.
  const shownIntention = intention || '(não informada)'

  return {
    subject: 'Novo pedido de acesso à Caativar',
    html: layout(
      title,
      paragraph(`<strong>${escapeHtml(email)}</strong> confirmou o endereço e aguarda liberação.`) +
        paragraph(escapeHtml(label)) +
        `<blockquote style="margin:0 0 14px;padding:12px 14px;background:${PAGE};border-left:3px solid ${ACCENT};font-size:14px;line-height:1.55;color:${INK};white-space:pre-wrap;">${escapeHtml(shownIntention)}</blockquote>` +
        callToAction('Abrir a tela de aprovação', approvalUrl),
    ),
    text: plainText(
      title,
      `${email} confirmou o endereço e aguarda liberação.`,
      `${label}\n${shownIntention}`,
      `Decida na tela de aprovação:\n${approvalUrl}`,
    ),
  }
}

export function buildDecisionEmail({ status, loginUrl }: { status: 'approved' | 'rejected'; loginUrl: string }): EmailDraft {
  if (status === 'approved') {
    const title = 'Acesso liberado'
    const body = 'Seu cadastro foi aprovado. A plataforma está disponível para acesso.'
    return {
      subject: 'Seu acesso à Caativar foi liberado',
      html: layout(title, paragraph(escapeHtml(body)) + callToAction('Entrar na Caativar', loginUrl)),
      text: plainText(title, body, loginUrl),
    }
  }

  // No login link: pointing at a door that does not open is worse than pointing at none.
  const title = 'Pedido não aprovado'
  const body = 'Analisamos seu pedido de acesso à Caativar e ele não foi aprovado desta vez.'
  const followUp = 'Caso acredite que houve um engano, responda a este e-mail descrevendo como pretende usar a plataforma.'
  return {
    subject: 'Sobre seu pedido de acesso à Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + paragraph(escapeHtml(followUp))),
    text: plainText(title, body, followUp),
  }
}

/** Says what to do if the person did not ask: anyone can type someone else's address. */
export function buildPasswordResetEmail({ link }: { link: string }): EmailDraft {
  const title = 'Redefinir senha'
  const body = 'Recebemos um pedido para trocar a senha da sua conta na Caativar. Use o botão abaixo para escolher uma nova senha. O link vale por uma hora e só pode ser usado uma vez.'
  const ignore = 'Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.'

  return {
    subject: 'Redefina sua senha — Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + callToAction('Escolher nova senha', link) + note(ignore)),
    text: plainText(title, body, link, ignore),
  }
}
