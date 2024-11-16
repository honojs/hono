/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export const handle =
  (app: Hono<any, any, any>) =>
  (req: Request): Response | Promise<Response> => {
    return app.fetch(req)
  }
