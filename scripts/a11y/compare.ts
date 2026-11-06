import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { diffImages } from './imageDiff'

/**
 * The comparison half of the no-visual-change guard (screens.mts): every
 * screenshot of `beforeDir` must be in `afterDir` and identical to the pixel.
 * Returns the exit code: 0 only when at least one screenshot was compared and
 * all matched. A directory that is missing or holds no screenshots fails, since
 * "0 route(s) identical" would otherwise read as proof of no visual change.
 */
export function compareScreens(
  beforeDir: string,
  afterDir: string,
  diffDir: string,
  log: (line: string) => void = console.log,
): number {
  for (const dir of [beforeDir, afterDir]) {
    if (!existsSync(dir)) {
      log(`✗ ${dir} does not exist`)
      return 1
    }
  }
  const before = readdirSync(beforeDir).filter((name) => name.endsWith('.png')).sort()
  if (before.length === 0) {
    log(`✗ ${beforeDir} has no screenshots: capture the routes before comparing`)
    return 1
  }

  mkdirSync(diffDir, { recursive: true })
  let failed = false
  for (const name of before) {
    const afterFile = join(afterDir, name)
    if (!existsSync(afterFile)) {
      failed = true
      log(`✗ ${name}: missing from ${afterDir}`)
      continue
    }
    const result = diffImages(PNG.sync.read(readFileSync(join(beforeDir, name))), PNG.sync.read(readFileSync(afterFile)))
    if (result.kind === 'size') {
      failed = true
      log(`✗ ${name}: size ${result.before.join('×')} → ${result.after.join('×')}`)
    } else if (result.differing > 0) {
      failed = true
      const png = new PNG({ width: result.diff.width, height: result.diff.height })
      png.data = Buffer.from(result.diff.data)
      writeFileSync(join(diffDir, name), PNG.sync.write(png))
      log(`✗ ${name}: ${result.differing} differing pixel(s) → ${join(diffDir, name)}`)
    } else {
      log(`✓ ${name}: identical`)
    }
  }
  for (const name of readdirSync(afterDir).filter((n) => n.endsWith('.png') && !before.includes(n))) {
    log(`• ${name}: new, not compared`)
  }
  log(failed ? '\nscreens: differences found.' : `\nscreens: ${before.length} route(s) identical.`)
  return failed ? 1 : 0
}

/**
 * Prepares the directory a capture writes to: created if missing, and emptied of
 * the screenshots an earlier capture left. Without that, a route since removed
 * from the list would keep its old PNG, and a later `compare` would pit it
 * against a capture that never took it. Only `.png` files go (not folders): the path is typed
 * by hand, and anything else in it is not ours to delete.
 */
export function prepareCaptureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.png')) rmSync(join(dir, entry.name))
  }
}
