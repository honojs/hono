import type { Context } from '../../context.ts'

export const env = <T extends Record<string, string>, C extends Context = Context<{}>>(
  c: C
): T & C['env'] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any

  if (
    c.runtime === 'bun' ||
    c.runtime === 'node' ||
    c.runtime === 'edge-light' ||
    c.runtime === 'lagon'
  ) {
    return global?.process?.env as T
  }
  if (c.runtime === 'deno') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Deno.env.toObject()
  }
  if (c.runtime === 'workerd') {
    return c.env
  }
  if (c.runtime === 'fastly') {
    // On Fastly Compute@Edge, you can use the ConfigStore to manage user-defined data.
    return {} as T
  }
  return {} as T
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

  if (global?.__lagon__ !== undefined) {
    return 'lagon'
  }

  if (global?.process?.release?.name === 'node') {
    return 'node'
  }

  return 'other'
}
