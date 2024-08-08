/**
 * @module flags
 * Some common flags about the environment.
 *
 * @credit unjs/std-env
 */

/** Value of process.platform */
export const platform = globalThis.process?.platform || ''

/** Detect if `CI` environment variable is set */
export const isCI = Boolean(globalThis.process?.env?.CI)

/** Detect if stdout.TTY is available */
export const hasTTY = Boolean(globalThis.process?.stdout && globalThis.process?.stdout.isTTY)

/** Detect if process.platform is Windows */
export const isWindows = /^win/i.test(platform)

/** Detect if process.platform is Linux */
export const isLinux = /^linux/i.test(platform)

/** Detect if process.platform is macOS (darwin kernel) */
export const isMacOS = /^darwin/i.test(platform)
