// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

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
  <E extends Env, S extends {}, BasePath extends string>(app: Hono<E, S, BasePath>): (
    eventContext: EventContext
  ) => Response | Promise<Response>
  /** @deprecated
   * Use `app.basePath()` to set a sub path instead of passing the second argument.
   * The `handle` will have only one argument in v4.
   */
  <E extends Env, S extends {}, BasePath extends string>(app: Hono<E, S, BasePath>, path: string): (
    eventContext: EventContext
  ) => Response | Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env, S extends {}, BasePath extends string>(
    subApp: Hono<E, S, BasePath>,
    path?: string
  ) =>
  (eventContext) => {
    const app = path ? new Hono<E, S, BasePath>().route(path, subApp as never) : subApp
    return app.fetch(
      eventContext.request,
      { ...eventContext.env, eventContext },
      {
        waitUntil: eventContext.waitUntil,
        passThroughOnException: eventContext.passThroughOnException,
      }
    )
  }
