import { HonoBase } from '../hono-base'
import { LinearRouter } from '../router/linear-router'
import type { Env } from '../types'

export class Hono<E extends Env = Env, S = {}, BasePath extends string = '/'> extends HonoBase<
  E,
  S,
  BasePath
> {
  constructor() {
    super()
    this.router = new LinearRouter()
  }
}
