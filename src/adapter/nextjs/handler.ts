// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

interface HandleInterface {
  <E extends Env, R extends Request, R2 extends Response>(app: Hono<E>): (req: R) => Promise<R2>
  <E extends Env, R extends Request, R2 extends Response>(path: string, app: Hono<E>): (
    req: R
  ) => Promise<R2>
}

export const handle: HandleInterface = (arg1: string | Hono, arg2?: Hono) => {
  if (typeof arg1 === 'string') {
    const app = new Hono()
    app.route(arg1, arg2)
    return async (req) => {
      return app.fetch(req)
    }
  }
  return async (req) => {
    return arg1.fetch(req)
  }
}
