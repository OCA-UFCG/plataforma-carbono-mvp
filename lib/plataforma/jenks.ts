/**
 * Jenks Natural Breaks Optimization (Fisher-Jenks).
 *
 * Finds the optimal way to partition a sorted array of numbers into
 * `numClasses` groups that minimizes within-group variance.
 *
 * @param data     Array of numeric values (does not need to be sorted).
 * @param numClasses  How many classes to create (e.g. 5).
 * @returns An array of `numClasses - 1` break values. Class boundaries are:
 *          class 1: [min ... breaks[0]]
 *          class 2: (breaks[0] ... breaks[1]]
 *          ...
 *          class k: (breaks[k-2] ... max]
 */
export function jenksBreaks(data: number[], numClasses: number): number[] {
  // Filter NaN / Infinity and sort ascending
  const sorted = data.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = sorted.length

  if (n === 0) return []
  if (n <= numClasses) {
    // Not enough distinct values, return unique values as breaks
    const unique = [...new Set(sorted)]
    return unique.slice(0, numClasses - 1)
  }

  const k = numClasses

  // lowerClassLimits[i][j] = optimal lower-class-limit for the first i values
  //                          split into j classes.
  // varianceCombinations[i][j] = minimum sum of squared deviations achievable.
  const lcl = Array.from({ length: n + 1 }, () => new Float64Array(k + 1))
  const vc  = Array.from({ length: n + 1 }, () => {
    const a = new Float64Array(k + 1)
    a.fill(Infinity)
    return a
  })

  // Base case: 1 class
  for (let i = 1; i <= k; i++) {
    lcl[1][i] = 1
    vc[1][i]  = 0
  }

  for (let l = 2; l <= n; l++) {
    let sum   = 0
    let sumSq = 0
    let w     = 0

    for (let m = 1; m <= l; m++) {
      const idx = l - m   // 0-indexed into sorted
      const val = sorted[idx]
      w++
      sum   += val
      sumSq += val * val
      const variance = sumSq - (sum * sum) / w

      if (m < l) {
        for (let j = 2; j <= k; j++) {
          const candidate = variance + vc[l - m][j - 1]
          if (candidate < vc[l][j]) {
            lcl[l][j] = l - m + 1
            vc[l][j]  = candidate
          }
        }
      }
    }

    lcl[l][1] = 1
    vc[l][1]  = sumSq - (sum * sum) / w
  }

  // Backtrack to extract break values
  const breaks: number[] = []
  let cursor = n
  for (let j = k; j >= 2; j--) {
    const lower = lcl[cursor][j]
    // The break value is the first element of the upper class
    breaks.unshift(sorted[lower - 1])
    cursor = lower - 1
  }

  return breaks
}
