// @denoify-ignore
import { Hono } from '../../hono'
import type { Env, MiddlewareHandler } from '../../types'

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
  /** @deprecated
   * Use `app.basePath()` to set a sub path instead of passing the second argument.
   * The `handle` will have only one argument in v4.
   */
  <E extends Env, S extends {}, BasePath extends string>(app: Hono<E, S, BasePath>, path: string): (
    eventContext: EventContext
  ) => Response | Promise<Response>
}

export const handle: HandleInterface =
  (subApp: Hono, path?: string) => (eventContext: EventContext) => {
    const app = path ? new Hono().route(path, subApp as never) : subApp
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
