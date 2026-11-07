import { Context } from '../../context'
import type { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { BlankSchema, Env, Input, MiddlewareHandler, Schema } from '../../types'

// Ref: https://github.com/cloudflare/workerd/blob/main/types/defines/pages.d.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params<P extends string = any> = Record<P, string | string[]>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 * @deprecated `hono/cloudflare-pages` will be removed in v5. Cloudflare recommends Workers with static assets; use `hono` on Workers instead.
 */
export type EventContext<Env = {}, P extends string = any, Data = Record<string, unknown>> = {
  request: Request
  functionPath: string
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
  env: Env & { ASSETS: { fetch: typeof fetch } }
  params: Params<P>
  data: Data
}

declare type PagesFunction<
  Env = unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>

/**
 * @deprecated `hono/cloudflare-pages` will be removed in v5. Cloudflare recommends Workers with static assets; use `hono` on Workers instead.
 */
export const handle =
  <E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = '/'>(
    app: Hono<E, S, BasePath>
  ): PagesFunction<E['Bindings']> =>
  (eventContext) => {
    return app.fetch(
      eventContext.request,
      { ...eventContext.env, eventContext },
      {
        waitUntil: eventContext.waitUntil,
        passThroughOnException: eventContext.passThroughOnException,
        props: {},
      }
    )
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 * @deprecated `hono/cloudflare-pages` will be removed in v5. Cloudflare recommends Workers with static assets; use `hono` on Workers instead.
 */
export function handleMiddleware<E extends Env = {}, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<
    E & {
      Bindings: {
        eventContext: EventContext
      }
    },
    P,
    I
  >
): PagesFunction<E['Bindings']> {
  return async (executionCtx) => {
    const context = new Context(executionCtx.request, {
      env: { ...executionCtx.env, eventContext: executionCtx },
      executionCtx,
    })

    let response: Response | void = undefined

    try {
      response = await middleware(context, async () => {
        try {
          context.res = await executionCtx.next()
        } catch (error) {
          if (error instanceof Error) {
            context.error = error
          } else {
            throw error
          }
        }
      })
    } catch (error) {
      if (error instanceof Error) {
        context.error = error
      } else {
        throw error
      }
    }

    if (response) {
      return response
    }

    if (context.error instanceof HTTPException) {
      return context.error.getResponse()
    }

    if (context.error) {
      throw context.error
    }

    return context.res
  }
}

declare abstract class FetcherLike {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
}

/**
 *
 * @description `serveStatic()` is for advanced mode:
 * https://developers.cloudflare.com/pages/platform/functions/advanced-mode/#set-up-a-function
 *
 * @deprecated `hono/cloudflare-pages` will be removed in v5. Cloudflare recommends Workers with static assets; use `hono` on Workers instead.
 */
export const serveStatic = (): MiddlewareHandler => {
  return async (c, next) => {
    // Unlike the other runtime adapters, this one cannot delegate to the core
    // `serveStatic` factory: it never touches a filesystem, it forwards the raw
    // request to the asset server bound to `env.ASSETS`, and the Pages environment
    // differs substantially from Deno/Bun/Workers. The core middleware therefore
    // restricts serving to GET/HEAD (#5514), and that guard does not reach this
    // adapter. Repeating it here keeps both static paths behaving identically:
    // a non-GET/HEAD request must not be answered with an asset's content. (#5223)
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      return next()
    }

    const env = c.env as { ASSETS: FetcherLike }
    const res = await env.ASSETS.fetch(c.req.raw)
    if (res.status === 404) {
      return c.notFound()
    }
    return res
  }
}
