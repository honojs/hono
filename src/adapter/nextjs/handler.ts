// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

interface HandleInterface {
  <E extends Env>(subApp: Hono<E>, path?: string): (req: Request) => Response | Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env>(subApp: Hono<E>, path?: string) =>
  (req) => {
    const app = path ? new Hono<E>().route(path, subApp) : subApp
    return app.fetch(req)
  }
