import { HonoBase } from '../hono-base'
import { PatternRouter } from '../router/pattern-router'
import type { Env, Schema } from '../types'

export class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(init: Partial<Pick<Hono, 'getPath'> & { strict: boolean }> = {}) {
    super(init)
    this.router = new PatternRouter()
  }
}
