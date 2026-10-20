// Assembles each animation of the glossary: the landscape engine
// (lib/cenas/fonte/paisagem.js) with one scene inserted at its /*@CENA@*/
// marker, wrapped in a function that takes the canvas and the options. The
// scene shares the engine's scope, as in the original package, and talks to it
// through the hooks of its `cena` object. Usage: node scripts/montar-cenas.mjs
// The output in lib/cenas/gerado/ is committed; tests/lib/cenas.test.ts fails
// when it is out of date.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FONTE = path.join(ROOT, 'lib', 'cenas', 'fonte')
const GERADO = path.join(ROOT, 'lib', 'cenas', 'gerado')
const MARKER = '/*@CENA@*/'

export function montar(motor, cena) {
  if (motor.split(MARKER).length !== 2) throw new Error(`o motor precisa ter um único ${MARKER}`)
  const corpo = motor.replace(MARKER, cena)
  return [
    '/* Gerado por scripts/montar-cenas.mjs a partir de lib/cenas/fonte; não editar. */',
    '/* eslint-disable */',
    'export function criarCena(cv, opcoes) {',
    "'use strict';",
    'opcoes = opcoes || {};',
    corpo,
    '}',
    '',
  ].join('\n')
}

const DTS = `/* Gerado por scripts/montar-cenas.mjs; não editar. */
import type { CriarCena } from '../tipos'
export declare const criarCena: CriarCena
`

export function cenas() {
  return readdirSync(FONTE).filter((f) => f.endsWith('.js') && f !== 'paisagem.js').map((f) => f.replace(/\.js$/, ''))
}

export function saidas() {
  const motor = readFileSync(path.join(FONTE, 'paisagem.js'), 'utf-8')
  return cenas().flatMap((nome) => [
    [path.join(GERADO, `${nome}.js`), montar(motor, readFileSync(path.join(FONTE, `${nome}.js`), 'utf-8'))],
    [path.join(GERADO, `${nome}.d.ts`), DTS],
  ])
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(GERADO, { recursive: true })
  for (const [arquivo, texto] of saidas()) {
    writeFileSync(arquivo, texto)
    console.log(path.relative(ROOT, arquivo))
  }
}
