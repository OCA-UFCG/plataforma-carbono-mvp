import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { contextIsUnique, matchTerritory } from '@/lib/mapa/searchMatch'

describe('matchTerritory', () => {
  describe('matching the label', () => {
    it('matches a substring of the label', () => {
      expect(matchTerritory('jesus', 'Bom Jesus')).toEqual({ start: 4, length: 5 })
    })

    it('ignores case and accents', () => {
      expect(matchTerritory('MOSSORO', 'Mossoró')).toEqual({ start: 0, length: 7 })
    })

    it('reports no match when the label does not contain the query', () => {
      expect(matchTerritory('recife', 'Bom Jesus')).toBeNull()
    })

    it('ignores surrounding whitespace in the query', () => {
      expect(matchTerritory('  jesus  ', 'Bom Jesus')).toEqual({ start: 4, length: 5 })
    })
  })

  describe('narrowing by state', () => {
    it('keeps the feature whose state the last word names', () => {
      expect(matchTerritory('bom jesus pi', 'Bom Jesus', 'PI')).toEqual({
        start: 0,
        length: 9,
      })
    })

    it('drops the homonym in another state', () => {
      expect(matchTerritory('bom jesus pi', 'Bom Jesus', 'RN')).toBeNull()
    })

    it('highlights only the part of the query that is the name', () => {
      // The state is a filter, not something to highlight inside the label.
      expect(matchTerritory('bom jesus pi', 'Bom Jesus', 'PI')?.length).toBe(9)
    })

    it('accepts the state spelled out', () => {
      expect(matchTerritory('bom jesus piaui', 'Bom Jesus', 'PI')).not.toBeNull()
      expect(matchTerritory('bom jesus piauí', 'Bom Jesus', 'PI')).not.toBeNull()
    })

    it('accepts a half-typed state', () => {
      expect(matchTerritory('bom jesus p', 'Bom Jesus', 'PI')).not.toBeNull()
      expect(matchTerritory('bom jesus p', 'Bom Jesus', 'BA')).toBeNull()
    })

    it('matches either side of a feature that straddles a border', () => {
      expect(matchTerritory('nova terra ce', 'PA Nova Terra', 'CE/PI')).not.toBeNull()
      expect(matchTerritory('nova terra pi', 'PA Nova Terra', 'CE/PI')).not.toBeNull()
      expect(matchTerritory('nova terra ba', 'PA Nova Terra', 'CE/PI')).toBeNull()
    })

    it('cannot narrow a layer that declares no state', () => {
      expect(matchTerritory('bom jesus pi', 'Bom Jesus')).toBeNull()
    })
  })

  describe('a context that identifies the feature by itself', () => {
    // On the states layer the abbreviation IS the feature: one per UF. The rule
    // that forbids a bare "PI" exists because a state holds 140 municipalities,
    // which is not the case here.
    it('matches a bare abbreviation the label does not contain', () => {
      expect(
        matchTerritory('rn', 'Rio Grande do Norte', 'RN', { contextIdentifies: true }),
      ).toEqual({ start: 0, length: 0 })
    })

    it('does not match it when the context does not identify the feature', () => {
      expect(matchTerritory('rn', 'Rio Grande do Norte', 'RN')).toBeNull()
    })

    it('highlights nothing, since the match was not in the label', () => {
      const match = matchTerritory('mg', 'Minas Gerais', 'MG', { contextIdentifies: true })

      expect(match?.length).toBe(0)
    })

    it('still prefers a real match in the label', () => {
      expect(
        matchTerritory('pernambuco', 'Pernambuco', 'PE', { contextIdentifies: true }),
      ).toEqual({ start: 0, length: 10 })
    })

    it('rejects an abbreviation that names another state', () => {
      expect(
        matchTerritory('ba', 'Minas Gerais', 'MG', { contextIdentifies: true }),
      ).toBeNull()
    })
  })

  describe('the rule that keeps a bare state out of the results', () => {
    it('does not treat a single word as a state', () => {
      // Otherwise typing "PI" would dump all 180 municipalities of the state.
      expect(matchTerritory('pi', 'Bom Jesus', 'PI')).toBeNull()
    })

    it('still matches a single word found in the label', () => {
      expect(matchTerritory('pe', 'Petrolina', 'PE')).toEqual({ start: 0, length: 2 })
    })

    it('prefers reading the whole query as a name', () => {
      // "São Domingos" must not be read as the name "São" in a state "Domingos".
      expect(matchTerritory('sao domingos', 'São Domingos', 'BA')).toEqual({
        start: 0,
        length: 12,
      })
    })

    it('reads the last word as a state only when the rest names the label', () => {
      expect(matchTerritory('serra ba', 'Serra Talhada', 'PE')).toBeNull()
    })
  })
})

describe('contextIsUnique', () => {
  it('is true when every feature carries a context of its own', () => {
    expect(contextIsUnique(['PE', 'MG', 'BA'])).toBe(true)
  })

  it('is false when a context is shared, as a state is by its municipalities', () => {
    expect(contextIsUnique(['PE', 'PE', 'BA'])).toBe(false)
  })

  it('is false when any feature has no context at all', () => {
    expect(contextIsUnique(['PE', undefined, 'BA'])).toBe(false)
  })

  it('is false for an empty layer, which identifies nothing', () => {
    expect(contextIsUnique([])).toBe(false)
  })
})

// The rule and the data have to work together: the rule can be right while the
// GeoJSON carries no state, which is exactly the state this repo was in before
// scripts/enrich-uf.py ran.
describe('the rule against the municipalities actually on disk', () => {
  const municipios: {
    features: { properties: { name_muni: string; abbrev_state: string } }[]
  } = JSON.parse(
    readFileSync(join(process.cwd(), 'public/data/vector/municipios.geojson'), 'utf-8'),
  )
  const all = municipios.features.map((f) => f.properties)

  function search(query: string) {
    return all.filter((p) => matchTerritory(query, p.name_muni, p.abbrev_state))
  }

  it('shows every homonym, each with a state of its own', () => {
    // Five features contain "bom jesus": Bom Jesus da Lapa and Bom Jesus da
    // Serra, both in BA, plus the three called exactly Bom Jesus, which are the
    // ones a reader cannot otherwise tell apart.
    const found = search('bom jesus')
    const exact = found.filter((p) => p.name_muni === 'Bom Jesus')

    expect(found).toHaveLength(5)
    expect(exact).toHaveLength(3)
    expect(exact.map((p) => p.abbrev_state).sort()).toEqual(['PB', 'PI', 'RN'])
  })

  it('narrows to one once the state is typed', () => {
    expect(search('bom jesus pi')).toHaveLength(1)
    expect(search('bom jesus pi')[0].abbrev_state).toBe('PI')
  })

  it('leaves no pair of municipalities that name and state cannot tell apart', () => {
    const keys = all.map((p) => `${p.name_muni}/${p.abbrev_state}`)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('does not let a bare state abbreviation list the whole state', () => {
    // "pi" is a substring of Picos and Piripiri, so it matches names. What it
    // must never do is match a municipality merely for being in Piauí: 86 of
    // the 140 the clip holds have no "pi" in their name, and none may appear.
    const found = search('pi')
    const piaui = all.filter((p) => p.abbrev_state === 'PI')
    const pulledInByState = found.filter(
      (p) => !normalizeSearch(p.name_muni).includes('pi'),
    )

    expect(piaui.length).toBeGreaterThan(100)
    expect(pulledInByState).toEqual([])
    expect(found.filter((p) => p.abbrev_state === 'PI').length).toBeLessThan(
      piaui.length / 2,
    )
  })
})

describe('the states layer actually on disk', () => {
  const estados: {
    features: { properties: { name_state: string; abbrev_state: string } }[]
  } = JSON.parse(
    readFileSync(join(process.cwd(), 'public/data/vector/estados.geojson'), 'utf-8'),
  )
  const all = estados.features.map((f) => f.properties)
  // What the search bar derives for this layer once the GeoJSON is loaded.
  const contextIdentifies = contextIsUnique(all.map((p) => p.abbrev_state))

  function search(query: string) {
    return all.filter((p) =>
      matchTerritory(query, p.name_state, p.abbrev_state, { contextIdentifies }),
    )
  }

  it('reads the abbreviation as identifying, one per state', () => {
    expect(contextIdentifies).toBe(true)
  })

  it('finds a state by its written-out name', () => {
    const found = search('pernambuco')

    expect(found).toHaveLength(1)
    expect(found[0].abbrev_state).toBe('PE')
  })

  it('finds a state by an abbreviation its name does not contain', () => {
    const found = search('rn')
    const matchOf = (uf: string) =>
      matchTerritory(
        'rn',
        all.find((p) => p.abbrev_state === uf)!.name_state,
        uf,
        { contextIdentifies },
      )

    // Two states answer "rn", by different routes, and both are right:
    // Rio Grande do Norte has no "rn" in its name and matches on the context,
    // a zero-length run because nothing in the label matched. Pernambuco has
    // one, at "Pe[rn]ambuco", and matches on the name like any other query.
    expect(found.map((p) => p.abbrev_state).sort()).toEqual(['PE', 'RN'])
    expect(matchOf('RN')).toEqual({ start: 0, length: 0 })
    expect(matchOf('PE')).toEqual({ start: 2, length: 2 })
  })

  it('finds every state by either spelling', () => {
    for (const { name_state: name, abbrev_state: uf } of all) {
      expect(search(uf).map((p) => p.abbrev_state), `${uf} by abbreviation`).toContain(uf)
      expect(search(name).map((p) => p.abbrev_state), `${name} by name`).toContain(uf)
    }
  })
})
