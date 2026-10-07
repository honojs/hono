/**
 * @module
 * Color utility.
 */

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` is set in the provided bindings or runtime environment, this function returns `false`.
 * Pass Cloudflare Workers bindings explicitly, for example `getColorEnabled(c.env)`.
 * @see {@link https://no-color.org/}
 *
 * @param {object} [env] - Optional environment bindings to check in addition to the runtime environment.
 * @returns {boolean}
 */
export function getColorEnabled(env?: object): boolean {
  if (env && 'NO_COLOR' in env) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  const isNoColor =
    typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : 'NO_COLOR' in (process?.env ?? {})

  return !isNoColor
}
