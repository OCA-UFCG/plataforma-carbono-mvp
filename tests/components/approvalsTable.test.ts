import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }))

import ApprovalsTable from '@/components/auth/ApprovalsTable'

describe('ApprovalsTable', () => {
  it('lists each request with its intention as text, its date and both decisions', () => {
    const markup = renderToStaticMarkup(createElement(ApprovalsTable, {
      rows: [{ uid: 'u1', email: 'fulana@gmail.com', intention: '<b>Pesquisa</b> sobre carbono', requestedAt: '15/10/2026' }],
    }))

    for (const column of ['E-mail', 'Intenção de uso', 'Pedido em', 'Decisão']) expect(markup).toContain(column)
    expect(markup).toContain('fulana@gmail.com')
    expect(markup).toContain('&lt;b&gt;Pesquisa&lt;/b&gt; sobre carbono')
    expect(markup).toContain('15/10/2026')
    expect(markup).toContain('Aprovar')
    expect(markup).toContain('Recusar')
  })

  it('says when nothing is waiting', () => {
    expect(renderToStaticMarkup(createElement(ApprovalsTable, { rows: [] }))).toContain('Nenhum pedido aguardando decisão.')
  })
})
