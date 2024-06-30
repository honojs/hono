/**
 * Handler for Service Worker
 * @module
 */

import type { Hono } from '../../hono'
import type { FetchEventLike } from '../../types'

type Handler = (evt: FetchEventLike) => void

/**
 * Adapter for Service Worker
 */
export const handle = (
  app: Hono,
  opts: {
    fetch: (req: Request) => Promise<Response>
  } = {
    fetch: fetch,
  }
): Handler => {
  return (evt) => {
    const fetched = app.fetch(evt.request)
    if (fetched instanceof Response && fetched.status === 404) {
      return
    }
    evt.respondWith(
      (async () => {
        const res = await fetched
        if (res.status === 404) {
          return await opts.fetch(evt.request)
        }
        return res
      })()
    )
  }
}
