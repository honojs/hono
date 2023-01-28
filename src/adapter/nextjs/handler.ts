// @denoify-ignore
import type { Hono } from '../../hono'
import type { Env } from '../../types'

export const handle = <E extends Env, R extends Request>(app: Hono<E>) => {
  return async (req: R) => {
    return app.fetch(req)
  }
}
