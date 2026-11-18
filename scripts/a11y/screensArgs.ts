import { parseArgs } from 'node:util'

/**
 * What screens.mts was asked to do. `capture` takes a directory and, after it,
 * the route paths to retake (none means every route); `--print` belongs to it
 * only. `compare` takes exactly three directories.
 */
export type ScreensCommand =
  | { command: 'capture'; dir: string; paths: string[]; print: boolean }
  | { command: 'compare'; beforeDir: string; afterDir: string; diffDir: string }

export const SCREENS_USAGE =
  'usage: a11y:screens capture <dir> [--print] [path …] | compare <beforeDir> <afterDir> <diffDir>'

/**
 * Parses the arguments after the script name. `parseArgs` with `strict` rejects
 * an unknown flag such as `--prnt` instead of reading it as a route, and its
 * message names that flag, so the caller can print it as it is. Every other
 * problem (no command, an unknown one, a wrong count of directories) is
 * returned as an error too, so the caller prints the usage once for all of them.
 */
export function parseScreensArgs(argv: readonly string[]): ScreensCommand | { error: string } {
  let parsed: ReturnType<typeof parseArgs<{ options: { print: { type: 'boolean' } }; allowPositionals: true }>>
  try {
    parsed = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: { print: { type: 'boolean' } },
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  const [command, ...rest] = parsed.positionals
  const print = parsed.values.print === true

  if (command === 'capture') {
    if (rest.length === 0) return { error: 'capture needs a directory' }
    return { command: 'capture', dir: rest[0], paths: rest.slice(1), print }
  }
  if (command === 'compare') {
    if (print) return { error: '--print belongs to capture, not compare' }
    if (rest.length !== 3) return { error: `compare takes 3 directories, got ${rest.length}` }
    return { command: 'compare', beforeDir: rest[0], afterDir: rest[1], diffDir: rest[2] }
  }
  if (command === undefined) return { error: 'no command given' }
  return { error: `unknown command: ${command}` }
}
