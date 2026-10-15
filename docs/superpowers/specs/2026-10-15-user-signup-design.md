# User signup — design

**Date:** 2026-10-15
**Status:** approved in conversation, section by section, before any code was written.

## 1. Goal

Today every account is created by hand in the Firebase console, and the login card says so:
*"Entre com as credenciais fornecidas pela equipe da plataforma."* After this work, people
request access themselves:

- whoever has an email on an allowlisted domain gets in as soon as they confirm the address;
- everyone else describes how they intend to use the platform and waits for a team member to
  approve the request.

The flow is a port of the one SAP shipped (`SAP-frontend`, PRs #352–#364, `docs/cadastro.md`
there), adapted to this repo: no next-intl, no verified-session cache, no operator role, a
separate Firebase project (`plataforma-carbono`, not `sap-project-123`, so nothing is shared
with SAP).

**Success:** with the switch on, a visitor on a listed domain signs up at `/cadastro`, clicks
the link in the email, chooses a password there, and lands on the map after logging in; a
visitor on any other domain does the same and waits on "Cadastro em análise" until an admin
presses "Aprovar" at `/aprovacoes`, then gets an email and logs in. The two existing accounts
keep working throughout.

## 2. Decisions

Settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | Who gets in after registering? | **Same as SAP.** Domains in `SIGNUP_ALLOWED_DOMAINS` are approved when the address is confirmed; every other address waits for manual approval. |
| 2 | Which SAP extras come along? | **Forgot password only.** No pending-count badge, no captcha (unmerged in SAP), no tighter rate limit (unmerged in SAP). |
| 3 | How do the new screens look? | **Like the login card.** Same gradient, cream card, inputs and green button. Approvals is a wider panel holding a table, same palette. |
| 4 | Where does "may enter" live? | **A custom claim on the Firebase account authorizes; Firestore audits** (SAP's model). Rejected alternatives: creating accounts disabled (unclear whether Firebase applies a verification code to a disabled account; pending and rejected look the same), and Firestore as the authority (a database read on every request). |
| 5 | Who approves, and where? | **Emails in `ACCESS_ADMIN_EMAILS`**, at `/aprovacoes`, on beta and prod alike. No menu entry: admins arrive from the team email's link or type the URL. |
| 6 | What does the waiting page show? | **A static card.** A pending user never gets a session cookie, so there is no email to show and nothing to sign out of. |
| 7 | Which Firestore collection do beta and prod use? | **The same one, `access-requests`.** They share Firebase accounts; separate collections would hide a request made on one environment from the other's approvals page. |
| 8 | Language | **Portuguese only.** SAP's `locale` field and per-locale templates are dropped. |
| 9 | Who sets the password, and when? | **Whoever reads the mailbox, on the confirmation page.** The signup form asks only for the email and the intention; the account is created without a password. Departs from SAP, whose document lists the alternative as an open flaw (§15). |

## 3. Current state

Checked on 2026-10-15 through the service account in `.env.local` (read-only):

| What | State | Consequence |
|---|---|---|
| Accounts | **2**, both `gmail.com`, neither with a confirmed email, no custom claims | The backfill grants `legacy` to exactly these two and signs each out once. |
| Client sign-up (Identity Toolkit `client.permissions`) | **Enabled** (nothing set) | **An open hole today:** anyone can call Firebase's `accounts:signUp` with the public API key, then log in at `/login` with full access, because nothing checks a claim yet. Turning it off is independent of this work and can happen now. Client sign-in keeps working. |
| Password policy | Not configured | Console step in §11. |
| Email enumeration protection | On | The reset flow looks the account up before generating a link (§5.6), as SAP does. |
| Firestore | **Never enabled** (API off, no rules released) | The database has to be created before rollout (§11). |
| Firebase's own auth emails | Built-in mailer, `noreply@plataforma-carbono.firebaseapp.com`, templates untouched, `en` | Unused by this design: the Admin SDK generates links but sends nothing, so we send our own mail (§9). |
| Authorized domains | `localhost`, `*.firebaseapp.com`, `*.web.app` | Fine as is: confirmation and reset go through our own pages, never Firebase's action handler. |

The Firebase MCP server is logged in as `plataformacarbonocaatinga@gmail.com`, which is not a
member of `plataforma-carbono`. Deploying rules from the MCP needs that account added in
Project settings → Users and permissions, or a login with the owner's account.

## 4. Authorization model

### 4.1 The claim authorizes

```ts
// on the Firebase account, inside every ID token and session cookie minted after it is set
{ caativar: { access: 'approved', tier: 'allowed' | 'common' | 'legacy', at: <unix seconds> } }
```

- `allowed`: a listed domain confirmed its address. `common`: an admin approved it.
  `legacy`: the backfill granted it to an account that predates signup.
- Namespaced under `caativar` because Firebase reserves top-level token names (`sub`, `iat`,
  `exp`…) and refuses a claim that collides with them.
- `readAccessClaim(claims)` returns `null` for anything that is not a well-formed approved claim.
  A missing claim and a malformed one take the same path: the one that denies.
- `approveAccess(uid, tier)` is the **only** writer of the approved claim (signup writes only the
  marker, §4.4). It reads the account's current claims and merges ours in (the call replaces the
  whole set, and ours replaces the marker), then calls
  `revokeRefreshTokens(uid)`. This repo verifies session cookies with `checkRevoked: true` and no
  cache, so the revocation applies on the next request.

### 4.2 Firestore audits

One document per account in `access-requests` (§7). It records who asked, what they wrote, who
decided and when. It never authorizes: nothing on the request path reads it.

### 4.3 The switch

`PLATFORM_ACCESS_GUARD_ENABLED=true` turns the gate on (SAP's name, kept so the setting reads the
same in both projects). The switch also opens signup: with it off, `/cadastro`,
`/cadastro/confirmacao` and every `/api/signup/*` route answer 404, and the login card shows no
"Criar conta" link. A session minted with the switch off checks neither the claim nor the email
of an account without the signup marker (§4.4), so an open signup in that state would make the
platform *more* open than before signup existed. Forgot password does not depend on the switch:
it creates no account.

Beta, production and local development share the Firebase accounts, so an account signup created
in one environment can try to log into another whose switch is off. The signup marker (§4.4) is
what refuses it there: the switch decides whether accounts *without* a claim get in, never
whether a signup account does.

### 4.4 Session gate, in `lib/auth.ts`

- **The signup marker.** `POST /api/signup` sets `{ caativar: { access: 'requested' } }`
  (`buildRequestedClaims`) on every account it creates, right after `createUser`; an account that
  cannot carry it is deleted (§5.1). `approveAccess` writes the approved claim over it.
  `isAccessRequested(claims)` reads it, and `readAccessClaim` treats it as no claim. It grants
  nothing: it bars the account whatever the switch says, since the switch can be off in another
  environment that shares the accounts (§4.3). The backfill skips marked accounts even when their
  request document is missing.
- `createSessionCookie(idToken)` returns
  `{ status: 'created', sessionCookie } | { status: 'unapproved', uid, email, emailVerified }`.
  A token carrying the marker gets no cookie whatever the switch says; with the switch on, neither
  does a token without an approved claim. The token is verified once; the claims and
  `email_verified` come from the decoded token, with no extra call.
- `verifySessionCookie(cookie)` additionally returns `null` under the same condition: the decoded
  cookie carries the marker, or the switch is on and it carries no approved claim. That covers
  cookies minted before the switch was turned on. Every layout (`getAuthenticatedSession`) and API
  route (`getAuthenticatedRequest`) already goes through it, so none of them change.

### 4.5 `POST /api/session`

```
creation = createSessionCookie(idToken)
if creation is unapproved and emailVerified:
    settlement = settleSignup(uid, email)                     // §5.3
    if settlement == 'approved': return 403 { code: 'access_granted' }
if creation is unapproved:
    return 403 { code: emailVerified ? 'access_pending' : 'email_unconfirmed' }
set the cookie, return 200
```

**Deviation from SAP, fixing a bug there.** When login settles a signup, SAP grants the claim and
then rebuilds the cookie from the *same* ID token. That token was minted before the claim
existed, so the user still gets `access_pending` and has to log in a second time. Here the route
answers `access_granted`, and `AuthProvider.signIn`, which still holds the credentials, signs in
once more and posts the new token: the fresh token carries the claim, and its `auth_time` is
after the revocation. The second attempt's outcome is the one returned; there is no third.

`AuthProvider.signIn` returns `'ok' | 'pending' | 'unconfirmed'` and throws for everything else.
It signs the Firebase client out on any non-`ok` outcome, as it does today on failure.

## 5. Flows

### 5.1 Signup

```
/cadastro form ─► POST /api/signup
                  switch off? 404 · untrusted origin? 403 · rate limit? 429
                  validate email, intention non-empty                    (400 on failure)
                  tier = resolveSignupTier(email)                        (never from the client)
                  createUser({ email, emailVerified: false })            (Admin SDK, no password)
                    email already taken ─► 201 { status: 'accepted' }   (same body, no mail)
                  setCustomUserClaims(uid, { caativar: { access: 'requested' } })   (marker, §4.4)
                    fails ─► deleteUser(uid), 500
                  createAccessRequest(uid, { email, tier, intention })
                    fails ─► deleteUser(uid), 500                        (no orphan accounts)
                  sendVerificationEmail(email)                           (failure logged, not fatal)
                  201 { status: 'accepted' }
```

An account without a password cannot sign in, so until confirmation it is inert.

The card then switches to "Confirme seu e-mail" with a resend button, which posts the submitted
address to `/api/signup/resend`. Resend sends only when the account exists, its email is not
confirmed and it holds no approved claim; it answers 202 `accepted` in every case. (The two
legacy accounts have unconfirmed emails, and a confirmation link would let whoever reads their
mailbox replace the password through the confirmation page; that is what "Esqueci minha senha"
is for.)

### 5.2 Confirmation

The email links to `/cadastro/confirmacao?code=…&email=…`. Opening the link spends nothing:

1. On mount the page posts `{ code }` to `POST /api/signup/confirm/check`. The server checks the
   code through Identity Toolkit without applying it (`accounts:resetPassword` with only
   `oobCode`, keyed by the public API key; it is what the client SDK's `checkActionCode` calls),
   and answers `{ email }` when the code is valid and its `requestType` is `VERIFY_EMAIL`,
   410 otherwise. Mail scanners that open the link on their own therefore spend no code and
   trigger no settlement.
2. Valid: the page shows "Conta: {email}" and the password fields. Invalid (expired, used, made
   up): "Link inválido ou expirado", with resend (posting the link's `email`) and a link to the
   login. A person who opens the link a second time has already chosen a password and only needs
   the login.
3. Submit posts `{ code, password }` to `POST /api/signup/confirm`:
   1. password shorter than 8 → 400 `weak-password`;
   2. check the code again (not spent) → the email it belongs to, or 410 `invalid-code`;
   3. `getUserByEmail(email)`; `updateUser(uid, { password })`;
   4. apply the code (`accounts:update` with `oobCode`), which marks the email confirmed;
   5. re-read the account, `settleSignup` (§5.3), answer
      `{ status: 'approved' | 'pending' | 'rejected' }`.

   The password is set **before** the code is applied. Applying first and then failing to set the
   password would leave a confirmed account with no password and a spent code; failing to apply
   after the password is set leaves an account with a password chosen by whoever held a valid code
   (the mailbox owner), whose login answers `email_unconfirmed` and offers resend.

The `email` in the link is not a credential: it only fills the resend button. The confirm route
takes the email from the code, never from the request. Unlike SAP's, the route never settles or
reports the status of an address it was merely given, so it is no oracle of which accounts are
confirmed.

### 5.3 Settlement — `settleSignup({ uid, email, emailVerified })`

Shared by the confirmation route and the login route.

1. Not verified → `'unconfirmed'`.
2. **The account already holds an approved claim → `'approved'`, without touching Firestore.**
   (Not in SAP. Both legacy accounts here have unconfirmed emails; anyone can request a
   verification email for them through resend, and without this step confirming it would open a
   request for an account that already has access and email the team about it.)
3. No request document (a signup that failed midway) → open one now, tier from the domain,
   empty intention.
4. Status already decided → return it. An `approved` request reaching this step has an account
   without the claim (step 2 returned otherwise): a grant that failed after the decision was
   recorded. It is granted again with the stored tier first, so the next login heals it.
5. `tier === 'allowed'` → `approveAccess(uid, 'allowed')`, record `approved` with
   `decidedBy: null` (the domain rule decided), return `'approved'`.
6. Otherwise notify the team once (§6.3) and return `'pending'`.

### 5.4 Login

`LoginForm` maps the outcomes:

| Outcome | What the user sees |
|---|---|
| `ok` | Redirect to `redirectTo`, as today |
| `pending` | `router.replace('/aguardando-liberacao')` |
| `unconfirmed` | Inline: "Confirme seu e-mail antes de entrar. Enviamos o link para o endereço do cadastro." plus "Reenviar e-mail de confirmação" (posts the typed email to resend). The password was correct, so this reveals nothing to a stranger. Rare: a signup account has no password until it confirms, so this needs a confirmation that set the password but failed to apply the code, or an account that reset its password before confirming. |
| `auth/user-disabled` (a rejected request), when Firebase reports it | "Esta conta não tem acesso à plataforma." |
| `auth/too-many-requests` | Unchanged |
| anything else | "E-mail ou senha inválidos.", unchanged |

### 5.5 Approval

`POST /api/signup/approve { uid, decision: 'approved' | 'rejected' }`:

1. Untrusted origin → 403. No session, or the session's email not in `ACCESS_ADMIN_EMAILS` → 403.
2. No request document → 404.
3. `approved` and the account's email is not confirmed (re-read from Firebase) → 409. Rejecting
   stays allowed: closing a suspicious request does not depend on it.
4. `claimPendingDecision` in a Firestore transaction writes `status`, `decidedBy` (the admin's
   email) and `decidedAt` only if the request is still pending; otherwise 409 with the current
   status. The decision is written **before** access is granted: a failure in between leaves a
   decided request without access (visible, recoverable) rather than access without a record.
5. `approved` → `approveAccess(uid, tier)`, with the tier the transaction read from the document,
   never from the page. `rejected` → `updateUser(uid, { disabled: true })`, so the account stops
   retrying the login (and its open sessions fail `checkRevoked`); reversible from the console.
6. Email the applicant (§9). The rejection email is sent only with
   `SIGNUP_SEND_REJECTION_EMAIL=true`. A mail failure is logged and does not fail the request: the
   decision is already recorded.

### 5.6 Forgot password

```
/login "Esqueci minha senha" ─► /esqueci-senha ─► POST /api/password-reset
    always 202 { status: 'accepted' }; the email goes out in after(), so response time does not
    reveal whether the account exists
─► email ─► /redefinir-senha?code=…
    POST /api/password-reset/check   { code }            → { email } or 410 (does not spend it)
    POST /api/password-reset/confirm { code, password }  → 200, or 410 invalid-code,
                                                           400 weak-password, 502 failed
```

- `sendPasswordResetEmail` calls `getUserByEmail` first: with enumeration protection on,
  `generatePasswordResetLink` for an unknown address fails as a generic `auth/internal-error`.
- `check` rejects a code whose `requestType` is not `PASSWORD_RESET` (Identity Toolkit also
  accepts verification codes there).
- `confirm` calls `revokeRefreshTokens` after the change, explicitly, even though Firebase already
  invalidates tokens when the password changes.
- The link is valid for one hour, once. That limit is Firebase's.
- A signup account that never confirmed has no password; a reset gives it one. Its next login
  then goes through §4.5: settled if resetting confirmed the address, `email_unconfirmed`
  otherwise. Either way it ends up on the normal path.

## 6. Pages and components

All new pages live in `app/(auth)/` so they share the login layout (fonts, `AuthProvider`,
Analytics) and need no session. Links inside the group use `next/link`; links out of it (to `/`)
use `<a href>`, per CLAUDE.md.

### 6.1 The shared card

`components/auth/AuthCard.tsx` takes the gradient background, the cream card and the "Caativar"
mark out of `LoginForm`, plus the shared input, label, button and link styles. `LoginForm` uses
it and renders identically. Width: 420px for every card, 960px for the approvals panel.

`components/auth/PasswordFields.tsx` holds the "Senha" / "Confirmar senha" pair with the
visibility toggle and the client-side checks (at least 8, both equal), shared by the
confirmation page and the reset page.

### 6.2 Routes

| Route | Server page | Client component | Notes |
|---|---|---|---|
| `/login` | existing | `LoginForm` (changed) | Gets `signupOpen` from the server. "Não tem conta? Criar conta" only when open; "Esqueci minha senha" always. The subtitle stays as it is while signup is closed and becomes "Entre com seu e-mail e senha." when open. |
| `/cadastro` | `notFound()` when the switch is off; a signed-in visitor is redirected to `/` | `SignupForm` | Email and intention only (textarea, `maxLength` 1000 as a courtesy; the server cut is the one that counts). |
| `/cadastro/confirmacao` | `notFound()` when off | `SignupConfirmation` | Checks the code on mount; states `checking`, `password`, `saving`, `approved`, `pending`, `rejected`, `invalid`, `failed`. |
| `/aguardando-liberacao` | static | — | No guard. |
| `/esqueci-senha` | — | `ForgotPasswordForm` | |
| `/redefinir-senha` | — | `ResetPasswordForm` | Checks the code on mount; states `checking`, `ready`, `invalid`, `saving`, `changed`. |
| `/aprovacoes` | No session → the login, with `redirect=/aprovacoes` (an admin arriving from the team email while logged out comes back here; `safeRedirect` gains `/aprovacoes`). A session whose email is not an admin's → `notFound()` (do not reveal the page exists to a signed-in non-admin). Lists pending requests whose email is confirmed, oldest first. Firestore failure → an alert in the panel instead of a broken page. | `ApprovalsTable` | Per-row state: `idle`, `working`, `approved`, `rejected`, `conflict`, `failed`; `router.refresh()` after a decision or a conflict. The intention cell is plain text with `white-space: pre-wrap`. |

Each page sets its own `metadata.title` ("Criar conta", "Confirmação de e-mail", "Cadastro em
análise", "Esqueci minha senha", "Nova senha", "Pedidos de acesso"); the group layout keeps
`"Entrar | Caativar"` as the default and the pages use the same `"… | Caativar"` form.

### 6.3 Copy

Ported from SAP's latest Portuguese copy (after its PR #357, which asked for an institutional
email and affiliation and dropped the informal tone), with SEDES/OCA replaced and "e-mail"
spelled as the login card does.

**Signup:** title "Criar conta" · labels "E-mail", "Como pretende usar a plataforma?" · email
placeholder "de preferência institucional" · intention placeholder "Se tiver vínculo com alguma
instituição, informe qual." · hint "Sua descrição é enviada à equipe da plataforma, que libera o
acesso." · note under the form "Você escolhe sua senha ao confirmar o e-mail." · errors "Informe
o e-mail.", "Informe um e-mail válido.", "Descreva como pretende usar a plataforma.", "Não foi
possível concluir o cadastro. Tente novamente." · button "Criar conta" / "Criando conta..." ·
"Já tem conta? Entrar".

**Signup sent:** "Confirme seu e-mail" · "Enviamos um link para o endereço informado. Abra o link
para confirmar o cadastro e escolher sua senha." · "Reenviar e-mail de confirmação" /
"Enviando..." · "Se o endereço estiver cadastrado, um novo e-mail foi enviado."

**Password fields** (confirmation and reset): "Senha" / "Confirmar senha" (reset: "Nova senha" /
"Confirmar nova senha") · "Mostrar senha" / "Ocultar senha" · "Informe a senha.", "A senha precisa
de pelo menos 8 caracteres.", "Confirme a senha.", "As senhas não são iguais." · weak (server)
"A senha não atende aos requisitos. Use pelo menos 8 caracteres."

**Confirmation:** checking "Verificando o link..." · password step "Escolha sua senha" /
"Conta: {email}" / "Confirmar cadastro" / "Confirmando..." · approved "Acesso liberado" / "Seu
e-mail foi confirmado e o acesso está liberado." / "Entrar na plataforma" · pending "E-mail
confirmado" / "Sua solicitação foi enviada à equipe da plataforma. Você receberá um e-mail quando
ela for analisada." · rejected "Pedido não aprovado" / "Este pedido de acesso não foi aprovado." ·
invalid "Link inválido ou expirado" / "Este link já foi usado ou expirou. Se você já confirmou o
cadastro, entre com seu e-mail e senha. Se não, peça um novo link." plus the resend button, its
status line and "Ir para o login" · failed "Não foi possível confirmar o cadastro. Tente
novamente."

**Waiting:** "Cadastro em análise" · "Seu e-mail foi confirmado e sua solicitação chegou à equipe
da plataforma. Assim que a intenção de uso que você descreveu for analisada, você receberá um
aviso por e-mail e poderá acessar a plataforma." · "Voltar para o login".

**Forgot password:** "Esqueci minha senha" · "Informe o e-mail da sua conta. Enviaremos um link
para escolher uma nova senha." · "Enviar link" / "Enviando..." · sent "Se houver uma conta com
este endereço, enviamos um link para redefinir a senha. O link vale por uma hora." · "Voltar para
o login".

**Reset password:** "Escolher nova senha" · "Conta: {email}" · the password fields · "Salvar
nova senha" / "Salvando..." · changed "Senha alterada" / "Sua senha foi alterada. Entre com a nova
senha." / "Entrar" · invalid "Link inválido ou expirado" / "Peça um novo link para redefinir a
senha." / "Pedir novo link" · failed "Não foi possível alterar a senha. Tente novamente."

**Approvals:** "Pedidos de acesso" · "Cadastros que confirmaram o e-mail e aguardam liberação." ·
empty "Nenhum pedido aguardando decisão." · columns "E-mail", "Intenção de uso", "Pedido em",
"Decisão" · "Aprovar", "Recusar", "Salvando...", "Aprovado", "Recusado" · "Não foi possível salvar
a decisão." · "Outra pessoa decidiu este pedido antes de você." · load failure "Não foi possível
carregar os pedidos. Avise a equipe técnica: pode faltar o índice do Firestore." · "Voltar para a
plataforma" (`<a href="/">`). "Pedido em" is formatted on the server (`pt-BR`, short date), so the
client never re-formats it in another time zone.

## 7. Data

### 7.1 `access-requests/{uid}`

| Field | Type | Notes |
|---|---|---|
| `email` | string | Lowercased |
| `tier` | `'allowed' \| 'common'` | Computed on the server from the email at signup |
| `intention` | string | Trimmed, whitespace collapsed, cut at 1000 characters; `''` when opened by §5.3 step 3 |
| `status` | `'pending' \| 'approved' \| 'rejected'` | |
| `createdAt` | ISO string | |
| `decidedAt` | ISO string \| null | |
| `decidedBy` | string \| null | Admin email; `null` when the domain rule decided |
| `notifiedAt` | ISO string \| null | Set inside the transaction that claims the right to email the team, so concurrent opens of the link send one email |

The document outlives the decision: it is the record that answers "who let this person in, and
when" months later.

The collection name comes from `FIREBASE_ACCESS_REQUESTS_COLLECTION`, defaulting to
`access-requests-local`. Forgetting it in production then creates a visibly empty collection,
which is better than forgetting it locally and writing test signups into production's. Beta and
prod set `access-requests` (decision 7). Local development shares the `plataforma-carbono`
project, so local test signups create real accounts there; delete them after testing.

### 7.2 Repository files

- `firestore.rules`: deny all reads and writes. The app only reaches Firestore through the Admin
  SDK, which bypasses rules; no browser needs access.
- `firestore.indexes.json`: a composite index on `status` ASC + `createdAt` ASC for both
  `access-requests` and `access-requests-local`. The approvals query filters on one and orders by
  the other, and fails with `FAILED_PRECONDITION` without it.
- `firebase.json`: points `firestore.rules` and `firestore.indexes.json`, so
  `firebase deploy --only firestore --project plataforma-carbono` publishes both.

## 8. Security

1. **No account enumeration.** Signup answers 201 `accepted` whether or not the email exists.
   Resend and the password-reset request always answer 202, and both send their email in
   `after()`, once the response is out, so response time does not reveal whether the account
   exists. Confirmation takes the email from
   the code only; an invalid code answers 410 whatever address the link carries.
2. **The tier is never trusted from the client.** It is recomputed from the email on the server,
   at signup and again in settlement step 3. Domain matching is exact, never by suffix:
   `ufcg.edu.br` admits neither `ccc.ufcg.edu.br` nor `naoufcg.edu.br`. A malformed address
   (no `@`, two `@`, an empty part) resolves to `common`.
3. **No orphan accounts.** A Firestore failure after `createUser` deletes the account; otherwise
   the person would get "accepted" forever and never receive an email.
4. **Transactions.** Team notification (`notifiedAt`) and the decision (`status`) are each claimed
   in a Firestore transaction, so double clicks, email scanners opening links and two admins at
   once each produce one effect.
5. **Approval needs a confirmed email**, re-read from Firebase on the server; the approvals page
   only lists confirmed requests, but the route does not trust the page.
6. **Free text.** The intention is the only free input written by a stranger: normalized and cut
   on the server, HTML-escaped in emails, rendered as text by React.
7. **Passwords:** at least 8 characters, checked on the server for confirmation and reset, plus
   Firebase's password policy (§11).
8. **Only the mailbox owner sets the password** (decision 9): the account is created without
   one, and the confirm route sets it only for the holder of a valid verification code. Opening
   the link spends nothing, so mail scanners cannot burn the code before the person clicks.
9. **Codes are credentials.** The confirmation and reset codes never reach logs. Mail errors are
   logged through `describeWithoutLink`, which strips the code from the message, since SMTP
   libraries sometimes echo the body they failed to send. `MAIL_LOG_BODY` defaults to off.
10. **Origin check** on every public mutation and on approve (`lib/access/trustedOrigin.ts`): reject
   when `Sec-Fetch-Site` is present and not `same-origin`/`none`; reject when `Origin` or `Referer`
   is present and not trusted; reject when none of the three is present. Trusted = the request
   URL's origin plus `APP_BASE_URL`'s, which matters behind the beta/prod proxy, where
   `request.url` may carry the internal host. To verify on beta before turning the switch on.
11. **Rate limits**, per client IP, one bucket per action, 1-minute window:

    | Action | Limit | Why |
    |---|---|---|
    | signup | 20 | Creates an account and sends mail; a whole training session can sign up from one building's IP |
    | resend | 10 | Sends mail on every call |
    | confirm check/confirm | 40 | The page checks the code as soon as it opens, and mail clients open links on their own to scan them |
    | password-reset request | 10 | Sends mail on every call |
    | password-reset check/confirm | 40 | The page checks the code as soon as it opens |

    A new `lib/rateLimit.ts` holds the factory, `createRateLimiter({ windowMs, max })`, and
    `clientAddress` / `clientIp`. `lib/mapa/rateLimit.ts` keeps its exports as a 60/min instance
    of it, so the GEE and report routes do not change. Without an address header the key falls back to the user agent and logs an
    error, so one global bucket cannot be exhausted to block signup for everyone.
12. **Admins** are read from `ACCESS_ADMIN_EMAILS` on every call, so removing someone applies on
    the next request.

## 9. Email

`lib/mailer.ts`, ported from SAP: nodemailer over `smtp.gmail.com:465` with an app password, the
only module that talks to the outside world. Without `SMTP_USER`/`SMTP_PASSWORD` it logs instead
of sending (an `error` in production, an `info` in development) and returns
`{ delivered: false }`; `MAIL_LOG_BODY=true` prints the plain-text body, which is how the whole
flow is tested locally without SMTP.

`lib/access/emails.ts` builds the messages. Rules that hold for all of them: inline CSS only, no
image the message depends on, the URL written out under every button, a plain-text part beside
the HTML. Palette from the login card (`#5f7030` button, `#26241d` ink, `#fffdf7` card).

| Email | To | Subject | Body (Portuguese) | Link |
|---|---|---|---|---|
| Confirmation | applicant | "Confirme seu endereço de e-mail — Caativar" | "Recebemos um cadastro na Caativar, a plataforma de monitoramento do carbono florestal da Caatinga, com este endereço. Confirme que este e-mail pertence a você e escolha sua senha para continuar." Button "Confirmar e escolher senha". "Se você não fez este cadastro, ignore este e-mail." | `/cadastro/confirmacao?code=…&email=…` |
| New request | `OCA_NOTIFICATION_EMAIL` | "Novo pedido de acesso à Caativar" | "{email} confirmou o endereço e aguarda liberação." / "Intenção de uso descrita no cadastro:" + the escaped intention in a quote block. Button "Abrir a tela de aprovação". | `/aprovacoes` |
| Approved | applicant | "Seu acesso à Caativar foi liberado" | "Acesso liberado" / "Seu cadastro foi aprovado. A plataforma está disponível para acesso." Button "Entrar na Caativar". | `/login` |
| Rejected (off by default) | applicant | "Sobre seu pedido de acesso à Caativar" | "Analisamos seu pedido de acesso à Caativar e ele não foi aprovado desta vez." / "Caso acredite que houve um engano, responda a este e-mail descrevendo como pretende usar a plataforma." No link. | — |
| Password reset | account | "Redefina sua senha — Caativar" | "Recebemos um pedido para trocar a senha da sua conta na Caativar. Use o botão abaixo para escolher uma nova senha. O link vale por uma hora e só pode ser usado uma vez." Button "Escolher nova senha". "Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma." | `/redefinir-senha?code=…` |

Every message ends with the fallback line "Se o botão não funcionar, copie este endereço no
navegador:" and the footer "Caativar — monitoramento do carbono florestal da Caatinga".
Auto-approval by domain sends no decision email: the confirmation page already says "Acesso
liberado".

Links are absolute, built from `APP_BASE_URL`. Without it, development falls back to
`http://localhost:3000` and production logs an error.

Gmail only accepts the authenticated account or a verified alias as the sender, so `SMTP_FROM`
must be one of those; anything else fails or breaks DKIM alignment. A regular Gmail account sends
to about 500 recipients a day; each signup produces up to three emails.

## 10. Configuration

All server-only, never `NEXT_PUBLIC_`. Added to `.env.example`, `deploy-beta.yml` and
`deploy-prod.yml` (`-e` lines; `SMTP_PASSWORD` from `secrets`, the rest from `vars`). Both
workflows read repository-level variables, so the two that differ by environment follow the
existing `_BETA` suffix convention (`CONTAINER_NAME_BETA` / `CONTAINER_NAME`): beta reads
`PLATFORM_ACCESS_GUARD_ENABLED_BETA` and `APP_BASE_URL_BETA`. The collection name is written into
both workflows as a literal, like `CONTENTFUL_PREVIEW=true`.

| Variable | Purpose | Beta / prod |
|---|---|---|
| `PLATFORM_ACCESS_GUARD_ENABLED` (beta: `_BETA`) | The switch (§4.3) | `false`, then `true` after the backfill, in both environments in the same session (§11) |
| `SIGNUP_ALLOWED_DOMAINS` | Comma-separated; `@ufcg.edu.br` and `ufcg.edu.br` both accepted; empty sends every signup to approval | Team decision |
| `ACCESS_ADMIN_EMAILS` | Comma-separated emails allowed at `/aprovacoes` | Team decision |
| `OCA_NOTIFICATION_EMAIL` | Team mailbox for new requests; a shared box, not a person | Team decision |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Sending account | Suggested: `plataformacarbonocaatinga@gmail.com` with two-step verification and an app password |
| `APP_BASE_URL` (beta: `_BETA`) | Origin for links in emails, also trusted by the origin check | Each environment's public URL |
| `FIREBASE_ACCESS_REQUESTS_COLLECTION` | §7.1 | `access-requests` on both |
| `SIGNUP_SEND_REJECTION_EMAIL` | Send the rejection email | `false` until the team decides |
| `MAIL_LOG_BODY` | Print email bodies to the log; development only (the link is a credential) | unset |

## 11. Rollout

**This order cannot be inverted.** Turning the switch on before the backfill locks out every
current user.

0. **Firebase console**, once:
   1. Authentication → Settings → User actions: **turn off "Enable create (sign-up)"**. Can be
      done today, before anything else ships (§3).
   2. Authentication → Settings → Password policy: require enforcement, minimum 8.
   3. Firestore: create the `(default)` database in Native mode. Suggested region
      `southamerica-east1`; the region cannot be changed later.
   4. Publish `firestore.rules` and `firestore.indexes.json`
      (`firebase deploy --only firestore --project plataforma-carbono`, or paste them in the
      console).
1. **Deploy with the switch off** and the other variables set. Nothing visible changes; signup
   answers 404.
2. **Backfill:** `node scripts/backfill-access-claims.mjs` (dry run), then `--apply`. It grants
   `legacy` to every account without a valid claim, skips accounts that have a signup request in
   `access-requests` or `access-requests-local` or carry the signup marker (§4.4), and revokes
   each granted account's tokens so the
   next login carries the claim. Idempotent. Today that is the 2 existing accounts, each asked to
   log in once.
3. **Turn the switch on in both environments in the same session:** turn it on in beta, walk the
   flow there briefly (including the origin check behind the proxy), then turn it on in prod right
   away. The claims are already valid on prod: the accounts are shared.

While the switch differs between environments, or after turning it off, the signup marker keeps
signup accounts out of a switch-off environment (§4.4). Turning the switch off still drops the
claim check for every other account, so an account created by hand in the console gets in without
a claim. Rolling back to an image without the marker check admits every confirmed signup account,
approved or not, wherever the switch is off, and an image from before signup has no switch at all:
disable the pending accounts in Firebase Authentication first (a rejection already disables the
account).

## 12. Files

**New**

- `lib/access/flag.ts` — `isAccessGuardEnabled`, `isSignupOpen`. Imports nothing, so the login
  page, `lib/auth.ts` and the routes can all use it.
- `lib/access/paths.ts` — route constants, safe to import from client components (no Admin SDK).
- `lib/access/claims.ts` — §4.1.
- `lib/access/domains.ts` — allowlist parsing, `resolveSignupTier`.
- `lib/access/admins.ts` — `isAccessAdmin(email)`.
- `lib/access/requests.ts` — Firestore record, `normalizeIntention`, `createAccessRequest`,
  `readAccessRequest`, `listPendingAccessRequests` (filters to confirmed accounts with batched
  `getUsers`), `claimTeamNotification`, `claimPendingDecision`, `recordAccessDecision`.
- `lib/access/settlement.ts` — §5.3.
- `lib/access/firebaseCodes.ts` — `extractOobCode`, `checkActionCode(code, expectedType)`
  (`accounts:resetPassword` with only `oobCode`; returns the email or `null`, spends nothing),
  `applyVerificationCode`, `resetPasswordWithCode` (Identity Toolkit REST, 10 s timeout,
  `cache: 'no-store'`).
- `lib/access/verification.ts` — `sendVerificationEmail`, `describeWithoutLink`.
- `lib/access/passwordReset.ts` — `sendPasswordResetEmail`.
- `lib/access/emailAddress.ts` (`normalizeEmail`, `isWellFormedEmail`),
  `lib/access/passwordRules.ts` (`MIN_PASSWORD_LENGTH`, the pair check),
  `lib/access/intention.ts` (`INTENTION_MAX_LENGTH`, `normalizeIntention`),
  `lib/access/signupForm.ts` (the form's client-side check), `lib/access/sessionCodes.ts`
  (`access_pending` / `access_granted` / `email_unconfirmed`), `lib/access/loginErrors.ts`:
  pure and client-safe, shared by the routes and the client components.
- `lib/access/emails.ts`, `lib/access/urls.ts`, `lib/access/trustedOrigin.ts`,
  `lib/access/rateLimits.ts`, `lib/access/http.ts` (shared `NO_STORE` responses, safe body read).
- `lib/mailer.ts`, `lib/rateLimit.ts`.
- `app/api/signup/{route,confirm/check/route,confirm/route,resend/route,approve/route}.ts`.
- `app/api/password-reset/{route,check/route,confirm/route}.ts`.
- `app/(auth)/{cadastro,cadastro/confirmacao,aguardando-liberacao,esqueci-senha,redefinir-senha,aprovacoes}/page.tsx`.
- `components/auth/{AuthCard,PasswordFields,ResendConfirmation,SignupForm,SignupConfirmation,ForgotPasswordForm,ResetPasswordForm,ApprovalsTable}.tsx`.
- `scripts/backfill-access-claims.mjs` — loads `.env.local` through `@next/env`'s
  `loadEnvConfig`, the loader the app uses. The line-by-line reader in `verify-assets.mjs` and
  `contentful-provision.mts` would cut the multi-line `FIREBASE_PRIVATE_KEY`, and Node 20's
  `--env-file` did (observed on 2026-10-15: "Failed to parse private key").
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`.
- `docs/signup.md` — in English, per CLAUDE.md: the manual console steps, rollout order,
  variables and how to test locally with `MAIL_LOG_BODY`.

**Changed**

- `lib/auth.ts` — §4.4. `lib/firebase-admin.ts` — `getFirebaseAdminApp()` shared by
  `getFirebaseAdminAuth()` and a new `getFirebaseAdminDb()`.
- `app/api/session/route.ts` — §4.5.
- `components/auth/AuthProvider.tsx`, `components/auth/LoginForm.tsx`, `app/(auth)/login/page.tsx`
  — §5.4, §6.2.
- `lib/mapa/rateLimit.ts` — the same exports, built on `lib/rateLimit.ts`.
- `lib/auth.ts` `safeRedirect` — `/aprovacoes` joins the allowed destinations.
- `.env.example`, `.github/workflows/deploy-{beta,prod}.yml`, `package.json` (`nodemailer`,
  `@types/nodemailer`).
- `CLAUDE.md` — the Authentication section (claim gate, signup, admins, `docs/signup.md`).
- `README.md` — `SMTP_PASSWORD` in the list of GitHub Actions secrets, in Portuguese to match the
  file.

## 13. Testing

Vitest runs in a node environment here, so tests target the server side with `firebase-admin`,
the mailer and `fetch` mocked; SAP's tests are ported and adapted.

- `tests/lib/access/`: domains (exact match, `@` prefix, malformed addresses), claims (read,
  build, merge with existing claims, revoke after set), intention normalization, collection name
  default, trusted origin (each header case, `APP_BASE_URL`), rate-limit factory (separate
  buckets, window reset, user-agent fallback), emails (escaping of email and intention, URL under
  the button, text part present), `describeWithoutLink`, firebaseCodes (check valid / invalid /
  `requestType` mismatch, applied / invalid, weak password), settlement (each step of §5.3,
  including the already-claimed account).
- `tests/lib/mailer.test.ts`: unconfigured logs and returns `delivered: false`; body logged only
  with `MAIL_LOG_BODY`.
- `tests/app/`: every route — 404 with the switch off (signup routes), 403 on a cross-site
  origin, 429 past the limit, identical bodies for new and existing emails, the account created
  without a password, orphan cleanup on a Firestore failure, resend silent for confirmed or
  claimed accounts, confirm check spending nothing, confirm rejecting a short password before
  touching the code, setting the password before applying the code, taking the email from the
  code and never from the body, `access_pending` / `email_unconfirmed` / `access_granted` on
  login, approve
  409 for an unconfirmed email and for an already-decided request, reject disables the account,
  admin check, reset `check`/`confirm` statuses and token revocation.
- `tests/scripts/backfillAccessClaims.test.ts`: `shouldBackfillUser`, claim merging, signup
  accounts skipped, and the script's namespace constants equal to `lib/access/claims.ts`'s (a
  backfill writing a claim the gate does not recognize would lock everyone out).

Rendered check: the whole flow on the dev server with `MAIL_LOG_BODY=true` and the switch on —
signup on an allowed domain and on another, confirmation link from the log, choosing the
password, reopening the used link, login, waiting page,
approval as an admin, reset password — using one test account in the shared project, deleted
afterwards. Then `npm test`, `npm run lint`, `npm run build`.

## 14. Out of scope

- Captcha and the tighter signup limit (both unmerged in SAP).
- A pending-count badge or a menu entry for `/aprovacoes`.
- Revoking someone's access from the product (console only, as in SAP).
- Customizing Firebase's own email templates (unused).
- Internationalization.

## 15. Why the password is chosen at confirmation

SAP's document lists one design flaw as open: its account and password are created **before**
anyone proves they own the mailbox. Someone can sign up with a third party's institutional
address and a password of their own; if the owner then clicks the confirmation link they never
asked for, the squatter's account is approved (instantly, on an allowlisted domain). The owner can
take it back through "Esqueci minha senha", but only after noticing.

Decided with the user on 2026-10-15 (decision 9): the signup form asks only for the email and
the intention, `createUser` runs without a password, and the confirmation page asks for it (§5.2).
Only whoever reads the mailbox can set the password. The cost is one more step on the
confirmation page, which reuses the reset page's fields.

What remains: a stranger can still sign up with someone else's address, and the request carries
the stranger's intention text. The owner gets an email for a signup they never made (it says to
ignore it), and if they confirm anyway, the account and its password are theirs; the team sees an
intention the owner did not write and can reject or ask.

**To verify first in implementation:** that `accounts:resetPassword` with only an `oobCode`
returns `requestType: 'VERIFY_EMAIL'` and the email for a verification code without spending it,
with email enumeration protection on. The client SDK's `checkActionCode` relies on this; if this
project's settings change it, the check step falls back to SAP's behavior of applying the code on
open, and the password step moves after it.
