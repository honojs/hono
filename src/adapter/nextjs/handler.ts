// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

interface HandleInterface {
  <E extends Env, S extends {}, BasePath extends string>(
    subApp: Hono<E, S, BasePath>,
    path?: string
  ): (req: Request) => Response | Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env, S extends {}, BasePath extends string>(
    subApp: Hono<E, S, BasePath>,
    path?: string
  ) =>
  (req) => {
    const app = path ? new Hono<E, S, BasePath>().route(path, subApp as never) : subApp
    return app.fetch(req)
  }
