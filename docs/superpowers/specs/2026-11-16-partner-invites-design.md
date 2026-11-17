# Partner invites — design

Date: 2026-11-16. Builds on the signup design (`2026-10-15-user-signup-design.md`) and its operations
guide (`docs/signup.md`); read both first, since this design reuses their flow and vocabulary.

## 1. Goal

Admins invite partners by email. The invitee gets a fixed, standardized message and, on accepting
it (confirming the address and choosing a password), gets access right away: no intention to
describe, no approval queue, whatever their email domain.

**Why.** Partners usually come from partner institutions' domains, but not always (a personal Gmail
address, a domain not in `SIGNUP_ALLOWED_DOMAINS`). Today such a partner has to sign up, describe an
intention and wait in `/aprovacoes`, even though an admin already decided to bring them in. The
invite turns that into one admin action.

## 2. Decisions

Taken with the user on 2026-11-16:

1. Only admins (`ACCESS_ADMIN_EMAILS`) invite.
2. Invitees can be on any domain. The invite overrides both the domain rule and the approval queue.
3. The invitee describes no intention of use.
4. The message is fixed: the admin types addresses only, with no free text.
5. The invite form lives on `/aprovacoes`, above the pending-requests table. No link to
   `/aprovacoes` is added anywhere (admins bookmark it); to be revisited later.
6. Approach A below: reuse the signup machinery with a new access tier, `invited`.
7. One PR, with the production tag cut right after its merge (§10).

**Non-goals:** a list of invites not yet accepted; cancelling an invite; custom text per invite or
per admin; the inviting admin's name or address in the message; invites by non-admins; a menu entry
for `/aprovacoes`; an English version of the email.

**Anti-goals** (failures even if the feature works):

- An invite grants access to an address nobody proved to own.
- The invite route lets anyone but an admin create accounts or send email.
- The public signup routes lose their sameness. They answer the same way for every address so they
  cannot be used to learn who has an account, and that must stay true.
- An invite quietly restores an account an admin revoked by hand.

## 3. Approaches

**A. Reuse the signup flow (chosen).** An admin-only route does what `POST /api/signup` does:

- creates the account without a password, carrying the `requested` marker;
- opens the `access-requests` record with tier `invited` and no intention;
- sends the invite email, which carries the same Firebase verification code as the confirmation
  email.

The link leads to the existing `/cadastro/confirmacao`. There `settleSignup` grants `invited` the
same way it grants `allowed` today. Expired links, resending and a confirmation that fails midway
are already handled for signup and now cover invites too. Cost: an ignored invite leaves an inert
account (no password, no access), as an abandoned signup does today.

**B. Grant access at invite time and email a set-password link (rejected).** The only code Firebase
mints for setting a password is the reset code, which lasts one hour, while an invite can sit in an
inbox for days. The confirmation route also refuses, on purpose, any account that already holds
access (`app/api/signup/confirm/route.ts`). The invitee would end up in "Esqueci minha senha".

**C. Our own invite tokens in Firestore (rejected).** No account would exist until the invite is
accepted, and invites could be cancelled with an expiry of our choosing. But it needs a new page
and a single-use token of our own (generated, stored hashed, spent in a transaction, expired),
re-implementing what Firebase's codes give and reopening ground the signup review closed. It only
pays off if cancelling invites matters, which is a non-goal.

## 4. Authorization

### 4.1 The new tier

`invited` joins `allowed`, `common` and `legacy` as a tier of the `caativar` claim. The claim records
how each account got in.

- **`lib/access/claims.ts`:** `AccessTier` and `ACCESS_TIERS` gain `invited`. **This is the trap of
  the whole feature:** `readAccessClaim` treats a tier outside `ACCESS_TIERS` as no access, so
  without it the claim is written and every session of the invitee is refused. Cover it with its
  own test.
- **`scripts/backfill-access-claims.mjs`:** `VALID_TIERS` gains `invited`. The backfill already
  skips invited accounts, since they carry a request, but its report would count them as invalid.
- **Request tier:** the request's tier type (today `SignupTier`, `'allowed' | 'common'`) gains
  `invited`. `resolveSignupTier` still returns only `allowed` or `common`: only the invite route
  writes `invited`, and the public signup never does.

### 4.2 The invite route's door — `POST /api/signup/invite`

The same checks as `/api/signup/approve`, plus the switch:

1. `rejectWhenSignupClosed()` → 404. An invite leads to the confirmation routes, which answer 404
   with the switch off.
2. `getAuthenticatedRequest(req)` → `unauthorizedResponse()`.
3. `hasTrustedOrigin(req)` → 403.
4. `isAccessAdmin(session.email)` → 403.

No per-IP rate limit: only admins pass the door. A cap of **10 addresses per request** bounds one
submission. The binding limit is run time: `lib/mailer.ts` opens a new SMTP connection per message,
so an address costs roughly 2–3.5 s (Firebase, Firestore, a Gmail login and send), and the whole
request must finish inside the reverse proxy's read timeout, nginx's default 60 s unless the
servers say otherwise. Ten addresses stay near 35 s. Gmail's budget of about 500 recipients a day
is far off. (Builder's call after the review: 20 risked the proxy cutting the request midway, which
shows every address as failed and makes a retry re-send invites that went out.)

## 5. Flows

### 5.1 Sending an invite

Body: `{ emails: string[] }`. The server normalizes each entry (`normalizeEmail`), drops
duplicates, refuses more than 10 with a 400, and handles the addresses **one after another**, each
with its own outcome. One address failing never stops the others.

Unlike the public signup routes, this route tells the truth about each address: the caller is an
admin. It also **awaits** the email, so the admin learns whether it went out.

Each address takes the first case that matches, judged on the Firebase account (`getUserByEmail`):

| # | The account | What the invite does | Outcome |
|---|---|---|---|
| a | Does not exist | Create it as signup does (`createUser` without a password, the `requested` marker, a request with tier `invited`, no intention, `invitedBy`, `invitedAt`), deleting the orphan if a step fails. Send the invite email. | `invited` |
| b | Holds the approved claim and is **disabled** | Nothing. Someone revoked it by hand (`docs/signup.md`, "Open points"), and re-enabling it would restore access behind their back. | `disabled` |
| c | Holds the approved claim | Nothing. | `already-active` |
| d | Email confirmed, no approved claim (a pending `common` request, a rejected one, or a confirmation that failed midway) | Re-enable the account if it is disabled. Record the request as approved by this admin, then grant the claim, then send the existing "Acesso liberado" email (`buildDecisionEmail`). | `approved` |
| e | Email not confirmed, no approved claim (a signup never confirmed, an invite not yet accepted, a rejected request whose address was never confirmed, an account created by hand) | Re-enable the account if it is disabled. Add the `requested` marker if the account carries no `caativar` claim. Upsert the request as `pending`, tier `invited`, with `invitedBy` and `invitedAt`, clearing any earlier decision. Send the invite email. | `invited` |

Two outcomes cover failures:

- **`unsent`:** the account and request are recorded, but the email did not go out. Inviting the
  address again sends it, through case e.
- **`failed`:** anything else broke. Log it without the code.

A malformed address gets **`invalid`**, and nothing is looked up.

**Case d:**

- **Order.** The decision is recorded before the claim is granted, as in the approve route. If the
  grant fails in between, the request is decided but the account has no access yet, and
  settlement re-grants it on the next login.
- **Race with the table.** Write the decision in a transaction that reads the current status. If
  another admin approved the same request from the table a moment earlier, the request is already
  approved; report `approved` anyway, without sending a second email.
- **Tier.** The request's tier becomes `invited` and the claim is granted with it, since the invite
  is what let the person in.
- **No request document** (a confirmed account whose signup failed before recording one): create
  it, as approved by this admin, then grant.
- **Request already `approved` but no claim** (a grant that failed earlier): grant again, which is
  idempotent; report `approved`.

**Case e** covers repeat invites: inviting an address that has not accepted yet sends the invite
again. It also covers a person who started signing up on their own: the request turns into an
invite, keeps the intention they wrote, and its next confirmation is approved without the queue.

### 5.2 Accepting

The confirmation page and `POST /api/signup/confirm` stay as they are. In `settleSignup`
(`lib/access/settlement.ts`), the branch that grants `allowed` grants `invited` too:

- the claim is granted with the request's own tier;
- the decision is recorded with `decidedBy: request.invitedBy`, since the inviting admin decided;
- the team is not emailed: the team sent the invite.

The page then shows the existing "Acesso liberado" outcome with "Entrar na plataforma".

The login route's settlement path, which picks up a confirmation that failed midway, needs nothing
new: it calls the same `settleSignup`.

### 5.3 Resending

If the invitee opens the link after it expires, the page offers a new link (`ResendConfirmation` →
`POST /api/signup/resend`). Today that sends the generic confirmation email, which opens with
"Recebemos um cadastro na Caativar…": wrong for someone who never signed up.

**The resend picks the invite email when the account's request has tier `invited`.** It reads the
request inside the `after()` callback that already does the lookup, so the route still answers
before any work and the sameness holds.

## 6. Data

`access-requests/{uid}` gains:

- `tier: 'invited'` as a possible value;
- `invitedBy: string | null` — the admin's normalized email;
- `invitedAt: string | null` — ISO time of the latest invite. `createdAt` is not enough: case e
  invites someone whose request already existed.

Older documents lack the two new fields; readers treat a missing one as `null`. The approvals query
is unchanged (`status` + `createdAt`), so no Firestore index changes.

`/aprovacoes` lists pending, confirmed requests. An invited request reaches that state only when its
settlement failed midway, which is rare. Such a row shows "Convite de {invitedBy}" in the intention
cell, so the admin knows why it has no intention. A self-signup an invite converted (case e) keeps
the intention its author wrote, and the cell shows that intention above the "Convite de …" line.

## 7. The page

`/aprovacoes` keeps its card, title and description. Above the table, inside the same card, comes an
`InviteForm` client component. It is rendered only while signup is open (`isSignupOpen()`), since
the route answers 404 otherwise.

```
┌ Convidar parceiros ─────────────────────────────────────────┐
│ O acesso é liberado assim que a pessoa confirmar o e-mail e  │
│ escolher a senha, sem passar por aprovação.                  │
│ E-mails (um por linha)                                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ pessoa@parceiro.org                                       │ │
│ │ outra@gmail.com                                           │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Enviar convites]                                            │
│ pessoa@parceiro.org — Convite enviado                        │
│ outra@gmail.com — Já tem acesso                              │
└──────────────────────────────────────────────────────────────┘
  (pending-requests table, as today)
```

- The textarea also splits on commas, semicolons and whitespace, since people paste lists.
- The result list is announced to screen readers (`role="status"`).
- After a submission the textarea keeps only the addresses a retry could help: `invalid` (to fix
  the typo), `unsent` and `failed`. It drops `invited`, `approved`, `already-active` and
  `disabled`, where inviting again changes nothing or re-sends.
- After any `approved`, call `router.refresh()`: the table must drop the request the invite just
  approved.

**Copy** (pt-BR, verbatim):

| Where | Text |
|---|---|
| Heading | "Convidar parceiros" |
| Help | "O acesso é liberado assim que a pessoa confirmar o e-mail e escolher a senha, sem passar por aprovação." |
| Label | "E-mails (um por linha)" |
| Button / working | "Enviar convites" / "Enviando..." |
| Empty | "Informe ao menos um e-mail." |
| Over the cap | "Envie no máximo 10 e-mails por vez." |
| `invited` | "Convite enviado" |
| `approved` | "Já tinha cadastro: acesso liberado" |
| `already-active` | "Já tem acesso" |
| `disabled` | "Conta desativada. Reative pelo console do Firebase." |
| `invalid` | "E-mail inválido" |
| `unsent` | "Conta criada, mas o e-mail não saiu. Convide de novo." |
| `failed` / request failed | "Não foi possível convidar." |

## 8. The email

`buildInviteEmail({ link })` in `lib/access/emails.ts` follows the file's rules: inline CSS, no
image the message depends on, the URL written out under the button, a plain-text part. The link is
`signupConfirmationUrl(code, email)`, the same as the confirmation email's.

| Part | Text |
|---|---|
| Subject | "Convite para a Caativar" |
| Title | "Convite para a Caativar" |
| Body | "A equipe da Caativar, a plataforma de monitoramento do carbono florestal da Caatinga, convidou você para acessá-la. Seu acesso já está liberado: confirme este endereço e escolha sua senha." |
| Button | "Aceitar convite e escolher senha" |
| Note | "Se você não esperava este convite, ignore este e-mail." |

The copy avoids gendered forms ("convidou você", not "você foi convidado"), since the invitee's
gender is unknown.

**Sending:** `sendVerificationEmail` is generalized to take the builder, so the invite and the
confirmation share the code extraction and the logging that strips the code from errors
(`describeWithoutLink`). Nothing may log the link.

## 9. Security

- **Access needs an owned address.** It is granted only after the mailbox owner uses the code
  (cases a, e) or to an address Firebase already marks confirmed (case d). An unconfirmed address
  never gets access from the invite itself.
- **Revoked accounts stay revoked.** The only in-app path that disables an account is a rejection,
  and a rejected account holds no approved claim. A disabled account holding the claim was revoked
  by hand, so case b reports it and touches nothing.
- **Unconfirmed accounts that already have a password** (one created by hand, say) get a code that
  lets the mailbox owner replace the password on the confirmation page. `POST /api/signup/resend`
  already does the same, and the mailbox owner is the address owner.
- **Admin-only and CSRF-proof:** the door in §4.2 checks the session and the trusted origin. The
  per-address detail in the response is visible only to admins.

## 10. Rollout

- No new variable and no index change. The switch is already on in beta and production.
- **The tier must reach production before anyone accepts an invite.** A merge to main deploys
  beta; production deploys only on a tag; both share the Firebase accounts. An invite accepted in
  between yields an `invited` claim that production's image does not know. Production refuses the
  session; its settlement re-grants the claim and revokes the person's tokens, ending their beta
  session too; the login ends on "aguardando liberação".
  **Decided with the user (2026-11-16): one PR, with the production tag cut right after the
  merge.** Main's tip is `v2.4` today, so that tag ships only this feature. `docs/signup.md` says
  not to invite anyone until production carries the tag. The local manual test (§12) creates an
  invited account on the shared project; it is a test account, deleted at the end of the test.
- **Rollback caveat, for `docs/signup.md`:** an image without the `invited` tier refuses every
  invited account's session, since the tier is not in its `ACCESS_TIERS`. Rolling back past this
  feature locks invitees out until it is redeployed.

## 11. Files

| File | Change |
|---|---|
| `lib/access/claims.ts` | `invited` in `AccessTier` / `ACCESS_TIERS` |
| `lib/access/domains.ts` or `requests.ts` | request tier type gains `invited` |
| `lib/access/requests.ts` | `invitedBy`, `invitedAt`; the invite upserts (case e) and the transactional approval (case d) |
| `lib/access/invites.ts` (new) | `inviteAddress(email, admin)` → outcome: the table in §5.1 |
| `lib/access/settlement.ts` | `invited` approves on confirmation, `decidedBy: invitedBy`, no team email |
| `lib/access/verification.ts` | send with a given builder; resend picks the invite email for `invited` |
| `lib/access/emails.ts` | `buildInviteEmail` |
| `app/api/signup/invite/route.ts` (new) | the door, the cap, the per-address loop |
| `app/api/signup/resend/route.ts` | the builder choice |
| `components/auth/InviteForm.tsx` (new) | the form and results |
| `app/(auth)/aprovacoes/page.tsx` | renders `InviteForm` while signup is open |
| `components/auth/ApprovalsTable.tsx` | "Convite de …" for invited rows |
| `scripts/backfill-access-claims.mjs` | `invited` in `VALID_TIERS` |
| `docs/signup.md` | an "Invites" section, the flow line, the rollback caveat |
| `CLAUDE.md` | the access paragraph: admins also invite partners at `/aprovacoes` |

## 12. Testing

Vitest, following the existing tests under `tests/`:

- **Claims:** `readAccessClaim` accepts `invited`, and the backfill accepts it in `VALID_TIERS`.
- **Settlement:** an `invited` request is approved on confirmation with `decidedBy` set to the
  inviting admin, and the team is not emailed.
- **Invite route:**
  - the door: 404 with the switch off, 401, 403 for an untrusted origin, 403 for a non-admin;
  - the cap, duplicates and malformed addresses;
  - each case a–e;
  - the orphan cleanup in case a;
  - a mail failure yielding `unsent`;
  - an approved-elsewhere race in case d sending no second email.
- **Resend:** the invite email for an `invited` request, the generic email otherwise.
- **Email:** the builder escapes and carries the link in both parts.
- **Form:** vitest runs in a `node` environment without jsdom, so the form's logic lives in pure
  helpers that the tests cover: parsing the separators, and choosing which addresses the textarea
  keeps. The refresh after `approved` is checked by hand.
- **Table:** the "Convite de …" note.

**Manual:** run locally as `docs/signup.md` describes (`MAIL_LOG_BODY=true`). Invite a test address,
copy the link from the log, choose a password, sign in. Then invite the same address again
(`already-active`), and a pending one (`approved`). Delete the test accounts afterwards.

## 13. Left to the builder

- Function and component names beyond those above.
- The form's styling within the card's existing tokens (`authStyles`, `authColors`).
- How the route reports a 400 (empty list, over the cap) in the body.
