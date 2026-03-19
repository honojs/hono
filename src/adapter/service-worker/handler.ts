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
 * Registers a Hono app to handle fetch events in a service worker.
 *
 * @param app - The Hono application instance
 * @param opts - Options for handling requests.
 * @param opts.fetch - The fetch function to use for falling back on 404. Defaults to `globalThis.fetch`.
 * @returns The handler function for the fetch event.
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
