import { HonoBase } from '../hono-base.ts'
import { LinearRouter } from '../router/linear-router/index.ts'
import type { Env } from '../types.ts'

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
