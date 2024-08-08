/**
 * @module
 * Color utility.
 */

import { hasTTY, isCI, isWindows } from './flags'

export function getColorEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  // It is put as a function instead of a constant to only to run as needed in the ternary operator.
  const isColorSupported = () =>
    !globalThis.process?.env?.NO_COLOR &&
    (Boolean(globalThis.process?.env?.FORCE_COLOR) ||
      ((hasTTY || isWindows) && globalThis.process?.env?.TERM !== 'dumb') ||
      isCI)

  const isNoColor =
    typeof process !== 'undefined'
      ? !isColorSupported()
      : typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : false

  return !isNoColor
}
