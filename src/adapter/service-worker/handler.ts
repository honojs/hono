/**
 * Handler for Service Worker
 * @module
 */

import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import type { FetchEvent } from './types'

type Handler = (evt: FetchEvent) => void
export type HandleOptions = {
  fetch?: typeof fetch
}

/**
 * Adapter for Service Worker
 */
export const handle = <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  opts: HandleOptions = {
    // To use `fetch` on a Service Worker correctly, bind it to `globalThis`.
    fetch: globalThis.fetch.bind(globalThis),
  }
): Handler => {
  return (evt) => {
    evt.respondWith(
      (async () => {
        // @ts-expect-error Passing FetchEvent but app.fetch expects ExecutionContext
        const res = await app.fetch(evt.request, {}, evt)
        if (opts.fetch && res.status === 404) {
          return await opts.fetch(evt.request)
        }
        return res
      })()
    )
  }
}
