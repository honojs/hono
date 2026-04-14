/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export const handle =
  (app: Hono<any, any, any>) =>
  (req: Request): Response | void | Promise<Response | void> => {
    return app.fetch(req)
  }
