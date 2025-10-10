/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export const handle = (
  app: Hono<any, any>
): ((req: Request, context: any) => Response | Promise<Response>) => {
  return (req: Request, context: any) => {
    return app.fetch(req, { context })
  }
}
