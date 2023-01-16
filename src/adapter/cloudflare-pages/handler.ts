// @denoify-ignore
import type { EventContext } from '@cloudflare/workers-types'
import type { Hono } from '../../hono'
import type { Env } from '../../types'

export const handle = <E extends Env>(app: Hono<E>) => {
  return (eventContext: EventContext<{}, string, {}>) => {
    const { request, env, waitUntil, passThroughOnException } = eventContext
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return app.fetch(request, env, { waitUntil, passThroughOnException })
  }
}
