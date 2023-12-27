// @denoify-ignore
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export const handle =
  (app: Hono<any, any, any>) =>
  ({ request }: { request: Request }) => {
    return app.fetch(request)
  }
