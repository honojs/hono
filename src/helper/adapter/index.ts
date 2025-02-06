/**
 * @module
 * Adapter Helper for Hono.
 */

import type { Context } from '../../context'

export type Runtime = 'node' | 'deno' | 'bun' | 'workerd' | 'fastly' | 'edge-light' | 'other'

export const env = <
  T extends Record<string, unknown>,
  C extends Context = Context<{
    Bindings: T
  }>
>(
  c: T extends Record<string, unknown> ? Context : C,
  runtime?: Runtime
): T & C['env'] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any
  const globalEnv = global?.process?.env as T

  runtime ??= getRuntimeKey()

  const runtimeEnvHandlers: Record<string, () => T> = {
    bun: () => globalEnv,
    node: () => globalEnv,
    'edge-light': () => globalEnv,
    deno: () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return Deno.env.toObject() as T
    },
    workerd: () => c.env,
    // On Fastly Compute, you can use the ConfigStore to manage user-defined data.
    fastly: () => ({} as T),
    other: () => ({} as T),
  }

  return runtimeEnvHandlers[runtime]()
}

export const knownUserAgents: Partial<Record<Runtime, string>> = {
  deno: 'Deno',
  bun: 'Bun',
  workerd: 'Cloudflare-Workers',
  node: 'Node.js',
}

export const getRuntimeKey = (): Runtime => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any

  // check if the current runtime supports navigator.userAgent
  const userAgentSupported =
    typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'

  // if supported, check the user agent
  if (userAgentSupported) {
    for (const [runtimeKey, userAgent] of Object.entries(knownUserAgents)) {
      if (checkUserAgentEquals(userAgent)) {
        return runtimeKey as Runtime
      }
    }
  }

  // check if running on Edge Runtime
  if (typeof global?.EdgeRuntime === 'string') {
    return 'edge-light'
  }

  // check if running on Fastly
  if (global?.fastly !== undefined) {
    return 'fastly'
  }

  // userAgent isn't supported before Node v21.1.0; so fallback to the old way
  if (global?.process?.release?.name === 'node') {
    return 'node'
  }

  // couldn't detect the runtime
  return 'other'
}

export const checkUserAgentEquals = (platform: string): boolean => {
  const userAgent = navigator.userAgent

  return userAgent.startsWith(platform)
}
