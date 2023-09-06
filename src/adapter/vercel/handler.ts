// @denoify-ignore
import type { Hono } from '../../hono'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handle = (app: Hono<any, any, any>) => (req: Request, event: any) => {
  return app.fetch(req, {}, event)
}
