// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

type EventContext = {
  request: Request
  waitUntil: (promise: Promise<unknown>) => void
  env: {} & { ASSETS: { fetch: typeof fetch } }
}

interface HandleInterface {
  <E extends Env>(app: Hono<E>, path?: string): (
    eventContext: EventContext
  ) => Response | Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env>(subApp: Hono<E>, path?: string) =>
  ({ request, env, waitUntil }) => {
    const app = path ? new Hono<E>().route(path, subApp) : subApp
    return app.fetch(request, env, { waitUntil, passThroughOnException: () => {} })
  }
