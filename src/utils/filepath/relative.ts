/**
 * Relative path
 * @module
 */

import { joinPaths } from './join'

/**
 * Resolve relative path from `from` to `to`.
 * @param from - The path from which you want to resolve.
 * @param to - The path you want to resolve.
 * @returns A relative path from `from` to `to`.
 * @example
 * ```ts
 * import { relative } from 'hono/utils/filepath'
 *
 * relative('/a/b/c', '/a/b/d/e') // => '../d/e'
 * ```
 */
export const relative = (from: string, to: string): string => {
  const normalizedFrom = joinPaths(from)
  const normalizedTo = joinPaths(to)

  const fromSegments = normalizedFrom.split('/')
  const toSegments = normalizedTo.split('/')

  const commonSegments: string[] = []

  for (let i = 0; i < Math.min(fromSegments.length, toSegments.length); i++) {
    if (fromSegments[i] !== toSegments[i]) {
      break
    }
    commonSegments.push(fromSegments[i])
  }

  const resultSegments = [
    ...Array(fromSegments.length - commonSegments.length).fill('..'),
    ...toSegments.slice(commonSegments.length),
  ]

  return resultSegments.join('/')
}
