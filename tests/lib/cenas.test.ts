import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { saidas } from '../../scripts/montar-cenas.mjs'

describe('glossary scenes', () => {
  // Line endings aside: git may check the files out with CRLF on Windows.
  it('keeps lib/cenas/gerado in step with the engine and the scenes', () => {
    const lf = (s: string) => s.replace(/\r\n/g, '\n')
    for (const [arquivo, texto] of saidas() as [string, string][]) {
      expect(lf(readFileSync(arquivo, 'utf-8')), `${arquivo}: rode node scripts/montar-cenas.mjs`).toBe(lf(texto))
    }
  })
})
