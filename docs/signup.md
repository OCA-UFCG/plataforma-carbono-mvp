# Signup and access

People request access themselves. Whoever has an email on a domain in `SIGNUP_ALLOWED_DOMAINS` gets in as soon as they confirm the address; everyone else describes how they intend to use the platform and waits for an admin. Design: `docs/superpowers/specs/2026-10-15-user-signup-design.md`.

This document exists because the feature **depends on manual steps outside the code**, one of which is the only defense against accounts created straight from the browser.

## The flow

```
/cadastro (email + intention) → POST /api/signup → account without a password + request + email
  → link → /cadastro/confirmacao → check the code (spends nothing) → choose a password
  → POST /api/signup/confirm → password set → code applied → settle
       ├── listed domain → claim granted → "Acesso liberado"
       └── any other     → pending + email to the team → /aprovacoes → decision email
```

Login of a correct password without access: `access_pending` sends the person to `/aguardando-liberacao`; `email_unconfirmed` offers a new link; `access_granted` (the claim was granted during this login) makes the client sign in once more, since the first ID token predates the claim.

## Where access lives

- **The custom claim** `caativar: { access: 'approved', tier, at }` on the Firebase account **authorizes**. It travels inside the session cookie and is read on every request without a database read. `lib/access/claims.ts` `approveAccess` is the only writer.
- **The Firestore collection** `access-requests` **audits**: who asked, what they wrote, who decided and when.

Do not invert them: authorizing from Firestore would add a database read to every request.

## Firebase console steps

| # | Where | What | Why |
|---|---|---|---|
| 1 | Authentication → Settings → User actions | **Turn off "Enable create (sign-up)"** | The API key is public. With client sign-up on, anyone creates an account straight through Google's API, skipping our form and the domain rule. Our signup uses the Admin SDK, which this setting does not block. Sign-in keeps working. |
| 2 | Authentication → Settings → Password policy | Require enforcement, minimum 8 | In "Notify" mode Firebase only warns and accepts the password anyway. Keep the minimum at 8 to match the app's own floor: the confirmation page does not yet map a stricter policy's refusal to the weak-password message. |
| 3 | Firestore | Create the `(default)` database, Native mode, `southamerica-east1` | The region cannot be changed later. |
| 4 | Firestore → Rules and Indexes | Publish `firestore.rules` and `firestore.indexes.json` | The rules close the database to browsers. The approvals page filters by `status` and orders by `createdAt`, which needs the composite index; without it the query fails with `FAILED_PRECONDITION` and the page shows an alert. |

Steps 3–4 can go through `firebase deploy --only firestore --project plataforma-carbono` with an account that is a member of the project.

Our own pages handle the confirmation and reset links, so the beta and production domains do not need to be in Authentication → Settings → Authorized domains.

**Google Analytics.** The confirmation and reset pages do not load GA, since their URL carries the one-time code (`/cadastro/confirmacao?code=…&email=…`, `/redefinir-senha?code=…`) and GA's page view sends the full URL. As defense in depth, turn on GA4 → Admin → Data streams → the web stream → Redact data → query parameters, listing `code` and `email`.

## Rollout order

**This order cannot be inverted**; out of order, every current user loses access.

1. Console steps above. **Step 1 (turning off client sign-up) comes before the backfill:** until it is off, anyone can create an account straight through Google's API, and the backfill would grant it `legacy`.
2. **Deploy with the switch off** (`PLATFORM_ACCESS_GUARD_ENABLED_BETA` / `PLATFORM_ACCESS_GUARD_ENABLED` unset or `false`). Nothing visible changes; the signup pages and routes answer 404.
3. **Backfill:** `node scripts/backfill-access-claims.mjs` (dry run), then `--apply`. It grants `legacy` to every account without a valid claim, skips signup accounts (a signup request or the signup marker), and signs each granted account out so its next login carries the claim. Idempotent. **Read the dry-run list before `--apply`:** every account it lists gets `legacy`, an account created through client sign-up included, so delete any you do not recognize first.
4. **Turn the switch on in both environments in the same session:** turn it on in beta, walk the flow there briefly, then turn it on in production right away. Beta and production share the Firebase accounts, so the claims are already valid on both. Before turning it on, confirm the reverse proxy in front of beta and production overwrites `X-Forwarded-For` rather than appending to it: the signup rate limits key on its first address, which a client controls if the proxy appends.

**Accounts created by hand.** An account created in the Firebase console after the rollout has no claim, so the gate refuses it: run the backfill again after creating one (dry run first). It skips signup accounts, so running it again approves no pending request.

**While the switch differs between environments, or when turning it off.** Every account signup creates carries a marker, `caativar: { access: 'requested' }`, until access is granted, and a session for a marked account is refused whatever the switch says: a switch-off environment refuses signup accounts. Turning the switch off still drops the claim check for every other account, so an account created by hand in the console gets in without a claim. **Rolling back to an image without the marker check admits every signup account that has a password, approved or not and confirmed or not, wherever the switch is off, and an image from before signup has no switch at all:** disable the pending accounts in Firebase Authentication first (a rejection already disables the account).

## The sending account

The emails go out through Gmail's SMTP with an **app password**, not the account password; creating one needs two-step verification, and some institutional domains forbid app passwords. Gmail only accepts the authenticated account or a verified alias as the sender, so `SMTP_FROM` must be one of those. A regular Gmail account sends to about 500 recipients a day; each signup produces up to three emails.

Without credentials nothing is sent and the log says so: an `error` in production, an `info` in development.

## Testing locally

```bash
PLATFORM_ACCESS_GUARD_ENABLED=true SIGNUP_ALLOWED_DOMAINS=example.com \
ACCESS_ADMIN_EMAILS=signup-test-allowed@example.com MAIL_LOG_BODY=true npm run dev
```

`MAIL_LOG_BODY=true` prints each email's text, links included, to the dev server's log: copy the confirmation link from there. **Never set it outside your machine: the link is a credential.** Local development uses the same Firebase project as beta and production, so test signups create real accounts: delete them afterwards (their requests sit in `access-requests-local`).

## Variables

| Variable | Purpose |
|---|---|
| `PLATFORM_ACCESS_GUARD_ENABLED` | The switch. Beta reads `PLATFORM_ACCESS_GUARD_ENABLED_BETA`. |
| `SIGNUP_ALLOWED_DOMAINS` | Domains approved on confirmation; exact match. Empty sends everyone to approval. |
| `ACCESS_ADMIN_EMAILS` | Who can open `/aprovacoes`. Every address listed must already be an account in the Firebase project: the approvals page trusts the signed-in email, so an unclaimed address could be taken by changing an account's email. |
| `OCA_NOTIFICATION_EMAIL` | The team's shared mailbox for new requests. |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | The sending account. |
| `APP_BASE_URL` | Origin of links in emails, also trusted by the origin check. Beta reads `APP_BASE_URL_BETA`. |
| `FIREBASE_ACCESS_REQUESTS_COLLECTION` | `access-requests` on beta and production; defaults to `access-requests-local`. |
| `SIGNUP_SEND_REJECTION_EMAIL` | `true` emails rejected applicants. Off until the team decides. |
| `MAIL_LOG_BODY` | Development only. |

## Open points

- No captcha yet; only per-IP limits.
- No way in the product to remove someone's access. **To revoke it, disable the account** in Firebase Authentication: sessions are verified with `checkRevoked` (`verifySessionCookie(…, true)`), which rejects a disabled account on its next request. Optionally set the request's `status` to `rejected` in Firestore, so the record says so. Removing the claim does not work: the console has no editor for custom claims, settlement grants an approved request again on the next login, and cookies already minted keep the claim for up to 24 h.
- Someone can still sign up with another person's address; the owner gets an email they can ignore, and if they confirm, the account and its password are theirs, with an intention text the owner did not write.
