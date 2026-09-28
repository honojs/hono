/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

/**
 * @deprecated `hono/vercel` will be removed in v5. Install `@hono/vercel` and import from there instead.
 */
export const handle =
  (app: Hono<any, any, any>) =>
  (req: Request): Response | Promise<Response> => {
    return app.fetch(req)
  }
