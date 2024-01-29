import type { Context } from '../../context.ts'

export type Runtime = 'node' | 'deno' | 'bun' | 'workerd' | 'fastly' | 'edge-light' | 'other'

export const env = <T extends Record<string, unknown>, C extends Context = Context<{}>>(
  c: C,
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

export const getRuntimeKey = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any

  if (global?.Deno !== undefined) {
    return 'deno'
  }
  if (global?.Bun !== undefined) {
    return 'bun'
  }
  if (typeof global?.WebSocketPair === 'function') {
    return 'workerd'
  }
  if (typeof global?.EdgeRuntime === 'string') {
    return 'edge-light'
  }
  if (global?.fastly !== undefined) {
    return 'fastly'
  }
  if (global?.process?.release?.name === 'node') {
    return 'node'
  }

  return 'other'
}
