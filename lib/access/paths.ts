/**
 * Routes of the access flow, importable from client components: nothing here pulls in the
 * Admin SDK.
 */
export const LOGIN_PATH = '/login'
export const SIGNUP_PATH = '/cadastro'
export const SIGNUP_CONFIRMATION_PATH = '/cadastro/confirmacao'
/** Where a correct password without access lands. Not /login: the password was right. */
export const PENDING_APPROVAL_PATH = '/aguardando-liberacao'
export const FORGOT_PASSWORD_PATH = '/esqueci-senha'
export const PASSWORD_RESET_PATH = '/redefinir-senha'
export const APPROVALS_PATH = '/aprovacoes'
