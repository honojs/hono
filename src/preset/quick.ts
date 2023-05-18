import { HonoBase } from '../hono-base'
import { LinearRouter } from '../router/linear-router'
import type { Env } from '../types'

export class Hono<E extends Env = Env, S = {}, BasePath extends string = '/'> extends HonoBase<
  E,
  S,
  BasePath
> {
  constructor(init: Partial<Pick<Hono, 'getPath'> & { strict: boolean }> = {}) {
    super(init)
    this.router = new LinearRouter()
  }
}
