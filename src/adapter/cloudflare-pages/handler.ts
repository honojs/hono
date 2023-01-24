// @denoify-ignore
import type { Hono } from '../../hono'
import type { Env } from '../../types'

type EventContext = {
  request: Request
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
  env: {} & { ASSETS: { fetch: typeof fetch } }
}

export const handle = <E extends Env>(app: Hono<E>) => {
  return (eventContext: EventContext): Response | Promise<Response> => {
    const { request, env, waitUntil, passThroughOnException } = eventContext
    return app.fetch(request, env, { waitUntil, passThroughOnException })
  }
}
