import { describe, expect, it } from 'vitest'
import { addressesToRetry, INVITE_OUTCOME_LABEL, parseInviteList, readInviteResults, type InviteOutcome } from '@/lib/access/inviteList'

describe('parseInviteList', () => {
  it('splits on lines, commas, semicolons and spaces, normalizing and dropping repeats', () => {
    expect(parseInviteList(' Parceira@Gmail.com\nfulana@ufcg.edu.br, outra@embrapa.br;\n\n parceira@gmail.com  ultima@inpe.br '))
      .toEqual(['parceira@gmail.com', 'fulana@ufcg.edu.br', 'outra@embrapa.br', 'ultima@inpe.br'])
  })

  it('returns nothing for blank text', () => {
    expect(parseInviteList(' \n , ; ')).toEqual([])
  })
})

describe('addressesToRetry', () => {
  it('keeps only what another try could change', () => {
    const outcomes: InviteOutcome[] = ['invited', 'approved', 'already-active', 'disabled', 'invalid', 'unsent', 'failed']
    const results = outcomes.map((outcome) => ({ email: `${outcome}@x.org`, outcome }))
    expect(addressesToRetry(results)).toEqual(['invalid@x.org', 'unsent@x.org', 'failed@x.org'])
  })
})

describe('readInviteResults', () => {
  it("reads the route's results", () => {
    expect(readInviteResults({ results: [{ email: 'a@x.org', outcome: 'invited' }] })).toEqual([{ email: 'a@x.org', outcome: 'invited' }])
  })

  it('refuses a body the route does not send', () => {
    for (const body of [null, {}, { results: 'x' }, { results: [{ email: 'a@x.org', outcome: 'toString' }] }, { results: [null] }]) {
      expect(readInviteResults(body as Record<string, unknown> | null)).toBeNull()
    }
  })
})

describe('INVITE_OUTCOME_LABEL', () => {
  it('has the copy the design fixes', () => {
    expect(INVITE_OUTCOME_LABEL.invited).toBe('Convite enviado')
    expect(INVITE_OUTCOME_LABEL.disabled).toBe('Conta desativada. Reative pelo console do Firebase.')
  })
})
