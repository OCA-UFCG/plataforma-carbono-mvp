import { isWellFormedEmail } from '@/lib/access/emailAddress'

/** The signup form's own check, so the person sees the error before the request leaves. */
export function signupFormError(email: string, intention: string): string | null {
  if (!email) return 'Informe o e-mail.'
  if (!isWellFormedEmail(email)) return 'Informe um e-mail válido.'
  if (!intention.trim()) return 'Descreva como pretende usar a plataforma.'
  return null
}
