// @denoify-ignore
import type { Hono } from '../../hono'
import type { MiddlewareHandler } from '../../types'

// Ref: https://github.com/cloudflare/workerd/blob/main/types/defines/pages.d.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params<P extends string = any> = Record<P, string | string[]>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventContext<Env = {}, P extends string = any, Data = {}> = {
  request: Request
  functionPath: string
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
  env: Env & { ASSETS: { fetch: typeof fetch } }
  params: Params<P>
  data: Data
}

interface HandleInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app: Hono<any, any, any>): (eventContext: EventContext) => Response | Promise<Response>
}

export const handle: HandleInterface = (app: Hono) => (eventContext: EventContext) => {
  return app.fetch(
    eventContext.request,
    { ...eventContext.env, eventContext },
    {
      waitUntil: eventContext.waitUntil,
      passThroughOnException: eventContext.passThroughOnException,
    }
  )
}

declare abstract class FetcherLike {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
}

/**
 *
 * @description `serveStatic()` is for advanced mode:
 * https://developers.cloudflare.com/pages/platform/functions/advanced-mode/#set-up-a-function
 *
 */
export const serveStatic = (): MiddlewareHandler => {
  return async (c) => {
    const env = c.env as { ASSETS: FetcherLike }
    const res = await env.ASSETS.fetch(c.req.raw)
    if (res.status === 404) {
      return c.notFound()
    }
    return res
  }
}
