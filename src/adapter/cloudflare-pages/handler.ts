import { Context } from '../../context'
import type { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { Env, Input, MiddlewareHandler } from '../../types'

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

declare type PagesFunction<
  Env = unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMiddleware<E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
): PagesFunction {
  return async (executionCtx) => {
    const context = new Context(executionCtx.request, {
      env: executionCtx.env,
      executionCtx,
    })

    let response: Response | void = undefined

    try {
      response = await middleware(context, async () => {
        context.res = await executionCtx.next()
      })
    } catch (error) {
      if (error instanceof HTTPException) {
        response = error.getResponse()
      } else {
        throw error
      }
    }

    return response ?? context.res
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
