/**
 * @module
 * Color utility.
 */
import type { Context } from '../context'
import { getRuntimeKey, env } from '../helper/adapter'

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * @see {@link https://no-color.org/}
 *
 * @param {Context} c - the context of request
 *
 * @returns {boolean}
 */
export function getColorEnabled(c: Context): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Deno } = globalThis as any

  const isNoColor = getRuntimeKey() === 'deno' ? Deno?.noColor : env(c).NO_COLOR

  return !isNoColor
}
