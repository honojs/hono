// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

interface HandleInterface {
  /** @deprecated
   * `hono/nextjs` will become obsolete in v4.
   * Use `hono/vercel` instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (subApp: Hono<any, any, any>): (req: Request) => Response | Promise<Response>
  /** @deprecated
   * Use `app.basePath()` to set a sub path instead of passing the second argument.
   * The `handle` will have only one argument in v4.
   */
  <E extends Env, S extends {}, BasePath extends string>(
    subApp: Hono<E, S, BasePath>,
    path: string
  ): (req: Request) => Response | Promise<Response>
}

export const handle: HandleInterface = (subApp: Hono, path?: string) => (req: Request) => {
  const app = path ? new Hono().route(path, subApp as never) : subApp
  return app.fetch(req)
}
