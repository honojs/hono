// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export const handle = (app: Hono<any, any, any>) => (req: Request, requestContext: FetchEvent) => {
  return app.fetch(req, {}, requestContext as any)
}
