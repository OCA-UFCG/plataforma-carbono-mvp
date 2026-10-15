/** The login card's message for a failed Firebase sign-in. */
export function loginErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  // A rejected request disables the account (app/api/signup/approve/route.ts).
  if (code === 'auth/user-disabled') return 'Esta conta não tem acesso à plataforma.'
  return 'E-mail ou senha inválidos.'
}
