import type { Context } from './context'

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
  if (c.runtime === 'fastly') {
    let env = {}
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const data = require('fastly:env')
      env = data.env
    } catch {}
    return env as T
  }
  if (c.runtime === 'workerd') {
    return c.env
  }
  return {} as T
}
