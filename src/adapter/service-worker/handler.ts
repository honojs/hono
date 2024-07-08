/**
 * Handler for Service Worker
 * @module
 */

import type { Hono } from '../../hono'

type Handler = (evt: FetchEvent) => void

/**
 * Adapter for Service Worker
 */
export const handle = (
  app: Hono,
  opts: {
    fetch?: typeof fetch
  } = {
    fetch: fetch,
  }
): Handler => {
  return (evt) => {
    evt.respondWith(
      (async () => {
        const res = await app.fetch(evt.request)
        if (opts.fetch && res.status === 404) {
          return await opts.fetch(evt.request)
        }
        return res
      })()
    )
  }
}
