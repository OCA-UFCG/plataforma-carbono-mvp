import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { diffImages } from './imageDiff'

/**
 * The file a capture leaves in its directory. Its presence marks the directory
 * as one a capture wrote, so a later capture may empty it (see prepareCaptureDir).
 */
export const CAPTURE_MARKER = '.a11y-capture'

/**
 * The comparison half of the no-visual-change guard (screens.mts): every
 * screenshot of `beforeDir` must be in `afterDir` and identical to the pixel.
 * Both directories must hold the same set of screenshots: a screenshot that only
 * `afterDir` holds fails the run too. Otherwise a partial `beforeDir` (one route
 * retaken after a flaky failure, say) would check a subset and still report
 * "identical". Returns the exit code: 0 only when at least one screenshot was
 * compared and all matched. A directory that is missing or holds no screenshots
 * fails, since "0 route(s) identical" would otherwise read as proof of no visual change.
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
  for (const name of readdirSync(afterDir).filter((n) => n.endsWith('.png') && !before.includes(n)).sort()) {
    failed = true
    log(`✗ ${name}: only in ${afterDir}`)
  }
  log(failed ? '\nscreens: differences found.' : `\nscreens: ${before.length} route(s) identical.`)
  return failed ? 1 : 0
}

/**
 * Prepares the directory a capture writes to: created if missing and, when
 * `opts.empty` is set, emptied of the screenshots an earlier capture left. Without
 * that, a route since removed from the list would keep its old PNG, and a later
 * `compare` would pit it against a capture that never took it. The caller sets
 * `empty` only on a full capture (no path arguments): retaking one route must keep
 * the others, or `compare` would be left checking a single file.
 *
 * The path is typed by hand, so a directory that holds anything but the output of
 * an earlier capture is refused: a slip like `capture public/logos` must not delete
 * the tracked logos. A directory counts as a capture's output when it holds the
 * `CAPTURE_MARKER` file, which this function writes on every run; an empty or new
 * directory needs no marker. Only `.png` files are removed (not folders, not other
 * files), and nothing is deleted when the directory is refused.
 */
export function prepareCaptureDir(dir: string, opts: { empty: boolean }): void {
  mkdirSync(dir, { recursive: true })
  const entries = readdirSync(dir, { withFileTypes: true })
  const marker = join(dir, CAPTURE_MARKER)
  if (entries.length > 0 && !existsSync(marker)) {
    throw new Error(
      `${dir} was not made by a capture (no ${CAPTURE_MARKER} file): pick an empty or new directory, or one an earlier capture wrote. Nothing was deleted.`,
    )
  }
  if (opts.empty) {
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.png')) rmSync(join(dir, entry.name))
    }
  }
  writeFileSync(marker, 'written by npm run a11y:screens capture; marks this directory as safe to empty\n')
}
