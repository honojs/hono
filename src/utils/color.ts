/**
 * @module
 * Color utility.
 */

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * @see {@link https://no-color.org/}
 *
 * @returns {boolean}
 */
export function getColorEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  const isNoColor =
    typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : process !== undefined
      ? // eslint-disable-next-line no-unsafe-optional-chaining
        'NO_COLOR' in process?.env
      : false

  return !isNoColor
}
