import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// There is no app/layout.tsx: each route group owns its <html> and <body>, so
// anything site-wide has to be mounted in every one of them.
const APP = path.resolve(import.meta.dirname, '../../app')
const ROOT_LAYOUTS = ['(auth)', '(mapa)', '(marketing)', '(relatorio)', '(territorios)']

function source(group: string) {
  return readFileSync(path.join(APP, group, 'layout.tsx'), 'utf8')
}

describe('root layouts', () => {
  it('the root layouts on disk are the five known ones', () => {
    const onDisk = readdirSync(APP)
      .filter((dir) => dir.startsWith('(') && existsSync(path.join(APP, dir, 'layout.tsx')))
      .sort()
    expect(onDisk).toEqual(ROOT_LAYOUTS)
  })

  it.each(ROOT_LAYOUTS)("%s mounts the announcer as the body's last child", (group) => {
    const code = source(group)
    expect(code).toMatch(/from ['"]@\/components\/a11y\/Announcer['"]/)
    expect(code).toMatch(/<Announcer \/>\s*<\/body>/)
  })
})
