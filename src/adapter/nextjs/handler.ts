// @denoify-ignore
import { Hono } from '../../hono'
import type { Env } from '../../types'

interface HandleInterface {
  <E extends Env>(subApp: Hono<E>, path?: string): (req: Request) => Promise<Response>
}

export const handle: HandleInterface =
  <E extends Env>(subApp: Hono<E>, path: string = '/') =>
  async (req) =>
    new Hono<E>().route(path, subApp).fetch(req)
