import { HonoBase } from '../hono-base.ts'
import type { HonoOptions } from '../hono-base.ts'
import { PatternRouter } from '../router/pattern-router/index.ts'
import type { Env, Schema } from '../types.ts'

export class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(options: HonoOptions<E, BasePath> = {}) {
    super(options)
    this.router = new PatternRouter()
  }
}
