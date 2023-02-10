// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

type EventContext = {
  request: Request
  waitUntil: (promise: Promise<unknown>) => void
  env: {} & { ASSETS: { fetch: typeof fetch } }
}

interface HandleInterface {
  <E extends Env>(app: Hono<E>): (eventContext: EventContext) => Response | Promise<Response>
  <E extends Env>(path: string, app: Hono<E>): (
    eventContext: EventContext
  ) => Response | Promise<Response>
}

export const handle: HandleInterface = (arg1: string | Hono, arg2?: Hono) => {
  if (typeof arg1 === 'string') {
    const app = new Hono()
    app.route(arg1, arg2)
    return (eventContext) => {
      const { request, env, waitUntil } = eventContext
      return app.fetch(request, env, { waitUntil, passThroughOnException: () => {} })
    }
  }
  return (eventContext) => {
    const { request, env, waitUntil } = eventContext
    return arg1.fetch(request, env, { waitUntil, passThroughOnException: () => {} })
  }
}
