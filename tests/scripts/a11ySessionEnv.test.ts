import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { adminCredentials, loadLocalEnv } from '@/scripts/a11y/sessionEnv'

const NAMES = [
  'FIREBASE_PRIVATE_KEY_BASE64',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
]
const saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]))
let dir: string | undefined

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

function envDir(contents: string) {
  dir = mkdtempSync(path.join(tmpdir(), 'a11y-session-env-'))
  writeFileSync(path.join(dir, '.env.local'), contents)
  return dir
}

// @next/env skips .env.local when NODE_ENV is "test", which vitest sets; the
// script runs under tsx with NODE_ENV unset, so load as it would.
function loadAsTheScript(dir: string) {
  const nodeEnv = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'development' })
  try {
    loadLocalEnv(dir)
  } finally {
    Object.assign(process.env, { NODE_ENV: nodeEnv })
  }
}

describe('the session script reads .env.local the way the app does', () => {
  it('prefers FIREBASE_PRIVATE_KEY_BASE64 over FIREBASE_PRIVATE_KEY, as lib/firebase-admin.ts does', () => {
    for (const name of NAMES) delete process.env[name]
    loadAsTheScript(
      envDir(
        [
          `FIREBASE_PRIVATE_KEY_BASE64=${Buffer.from('the-current-key').toString('base64')}`,
          'FIREBASE_PRIVATE_KEY="an-older-key"',
          'FIREBASE_CLIENT_EMAIL=conta@projeto.iam.gserviceaccount.com',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto',
          'NEXT_PUBLIC_FIREBASE_API_KEY=chave',
        ].join('\n'),
      ),
    )
    expect(adminCredentials(process.env)).toEqual({
      projectId: 'projeto',
      clientEmail: 'conta@projeto.iam.gserviceaccount.com',
      privateKey: 'the-current-key',
      apiKey: 'chave',
    })
  })

  it('reads a quoted multi-line FIREBASE_PRIVATE_KEY whole', () => {
    for (const name of NAMES) delete process.env[name]
    loadAsTheScript(
      envDir(
        [
          'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----',
          'abc',
          '-----END PRIVATE KEY-----"',
          'FIREBASE_CLIENT_EMAIL=conta@projeto.iam.gserviceaccount.com',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto',
          'NEXT_PUBLIC_FIREBASE_API_KEY=chave',
        ].join('\n'),
      ),
    )
    expect(adminCredentials(process.env)?.privateKey).toBe('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')
  })

  it('returns null when a credential is missing', () => {
    expect(adminCredentials({ NEXT_PUBLIC_FIREBASE_API_KEY: 'chave' })).toBeNull()
  })
})
