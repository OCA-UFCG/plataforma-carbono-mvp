import { describe, expect, it } from 'vitest'
import { TERRITORIOS_COPY, territoriosCopyDefaults } from '@/lib/content/territorios'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'

describe('the Territórios copy', () => {
  it('has a type per tab, in the order of the tabs, between the presentation and "Sobre os dados"', () => {
    expect(Object.values(TERRITORIOS_COPY).map((t) => t.id)).toEqual([
      'territoriosApresentacao', 'territoriosTerritorio', 'territoriosEstoque', 'territoriosFluxo',
      'territoriosUso', 'territoriosFogo', 'territoriosChuva', 'territoriosSobreDados',
    ])
  })

  // Provisioning, the round-trip checks and the space test all walk this list.
  it('is provisioned with the institutional copy', () => {
    for (const type of Object.values(TERRITORIOS_COPY)) expect(SITE_COPY_TYPES, type.id).toContain(type)
  })

  it('gives every tab its question and its source in "Sobre os dados"', () => {
    const copy = territoriosCopyDefaults()

    for (const tab of [copy.territorio, copy.estoque, copy.fluxo, copy.uso, copy.fogo, copy.chuva]) {
      expect(tab.pergunta).toMatch(/\?$/)
      expect(tab.sobreTitulo).not.toBe('')
      expect(tab.sobreTexto).not.toBe('')
    }
  })
})
