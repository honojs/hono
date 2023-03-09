// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

type EventContext = {
  request: Request
  waitUntil: (promise: Promise<unknown>) => void
  env: {} & { ASSETS: { fetch: typeof fetch } }
}

interface HandleInterface {
  <E extends Env, S extends {}, BasePath extends string>(
    app: Hono<E, S, BasePath>,
    path?: string
  ): (eventContext: EventContext) => Response | Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env, S extends {}, BasePath extends string>(
    subApp: Hono<E, S, BasePath>,
    path?: string
  ) =>
  ({ request, env, waitUntil }) => {
    const app = path ? new Hono<E, S, BasePath>().route(path, subApp as any) : subApp
    return app.fetch(request, env, { waitUntil, passThroughOnException: () => {} })
  }
