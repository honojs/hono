/**
 * @module
 * Color utility.
 */

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * Unlike getColorEnabledAsync(), this cannot check Cloudflare environment variables.
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

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * @see {@link https://no-color.org/}
 *
 * @returns {boolean}
 */
export async function getColorEnabledAsync(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { navigator } = globalThis as any
  // Avoid analysis of cloudflare scheme by bundlers
  // eslint-disable-next-line prefer-const
  let cfWorkers = 'cloudflare:workers'

  const isNoColor =
    navigator !== undefined && navigator.userAgent === 'Cloudflare-Workers'
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        'NO_COLOR' in ((await import(cfWorkers)).env ?? {}) // {} is for backward compat
      : !getColorEnabled()

  return !isNoColor
}
