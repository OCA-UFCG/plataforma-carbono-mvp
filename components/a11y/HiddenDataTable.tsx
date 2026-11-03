import { VISUALLY_HIDDEN } from '@/lib/a11y/visuallyHidden'

/** What a cell reads when its row has no value for that column. */
export const MISSING_VALUE = 'sem dado'

export type HiddenDataRow = { label: string; values: ReadonlyArray<string | null | undefined> }

export type HiddenDataTableProps = {
  caption: string
  /** The first column's header, which names what the rows are (e.g. "Ano"). */
  rowHeader: string
  columns: readonly string[]
  rows: readonly HiddenDataRow[]
}

/**
 * A chart's values as a table that only assistive technology reads: invisible
 * on screen and in print, so the page looks exactly as before (spec decision
 * 2), while a screen reader can walk it row by row instead of depending on a
 * pointer tooltip.
 *
 * Values arrive formatted (number, unit, pt-BR separators), by the same
 * formatters the chart uses. Pair it with Recharts' accessibilityLayer={false}
 * and role="img" plus a one-line aria-label on the chart's wrapper. Render the
 * table beside that wrapper, never inside it: role="img" makes everything it
 * contains presentational, and a table inside would be silenced.
 *
 * The clip sits on a wrapper, not on the table: some screen readers lose table
 * navigation when the table itself is clipped. No hooks, so server and client
 * components can both render it.
 */
export function HiddenDataTable({ caption, rowHeader, columns, rows }: HiddenDataTableProps) {
  if (rows.length === 0) return null
  return (
    <div style={VISUALLY_HIDDEN}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{rowHeader}</th>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {columns.map((column, i) => (
                <td key={column}>{row.values[i] ?? MISSING_VALUE}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
