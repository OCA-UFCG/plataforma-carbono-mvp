import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { saidas } from '../../scripts/montar-cenas.mjs'

describe('glossary scenes', () => {
  it('keeps lib/cenas/gerado in step with the engine and the scenes', () => {
    for (const [arquivo, texto] of saidas() as [string, string][]) {
      expect(readFileSync(arquivo, 'utf-8'), `${arquivo}: rode node scripts/montar-cenas.mjs`).toBe(texto)
    }
  })
})
