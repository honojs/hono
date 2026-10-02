/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

/**
 * @deprecated `hono/netlify` will be removed in v5. Install `@hono/netlify` and import from there instead.
 */
export const handle = (
  app: Hono<any, any>
): ((req: Request, context: any) => Response | Promise<Response>) => {
  return (req: Request, context: any) => {
    return app.fetch(req, { context })
  }
}
