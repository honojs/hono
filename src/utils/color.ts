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
import { hasTTY, isCI, isWindows } from './flags'

export function getColorEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  const isColorSupported = () => {
    if (globalThis.process?.env?.NO_COLOR) {
      return false
    }
    if (globalThis.process?.env?.FORCE_COLOR) {
      return true
    }
    return ((hasTTY || isWindows) && globalThis.process?.env?.TERM !== 'dumb') || isCI
  }

  const isNoColor =
    typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : process !== undefined
        ? !isColorSupported()
        : false

  if (isNoColor) {
    return false
  }

  // Fallback for Deno TTY if it wasn't caught by process
  if (Deno?.stdout) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stdout = Deno.stdout as any
    return !!(stdout.isTerminal?.() || (Deno.isatty && Deno.isatty(stdout.rid)))
  }

  return true
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
  const cfWorkers = 'cloudflare:workers'

  const isNoColor =
    navigator !== undefined && navigator.userAgent === 'Cloudflare-Workers'
      ? await (async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return 'NO_COLOR' in ((await import(cfWorkers)).env ?? {}) // {} is for backward compat
          } catch {
            return false
          }
        })()
      : !getColorEnabled()

  return !isNoColor
}
