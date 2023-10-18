// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'
import type { FetchEventLike } from '../../types'

export const handle =
  (app: Hono<any, any, any>) => (req: Request, requestContext: FetchEventLike) => {
    return app.fetch(req, {}, requestContext as any)
  }
