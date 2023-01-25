// @denoify-ignore
/// <reference types="@cloudflare/workers-types" />
import type { Hono } from '../../hono'
import type { Env } from '../../types'

export const handle = <E extends Env>(app: Hono<E>) => {
  return (eventContext: EventContext<{}, string, {}>): Response | Promise<Response> => {
    const { request, env, waitUntil, passThroughOnException } = eventContext
    return app.fetch(request, env, { waitUntil, passThroughOnException })
  }
}
