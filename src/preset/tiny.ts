import { HonoBase } from '../hono-base'
import type { HonoOptions } from '../hono-base'
import { PatternRouter } from '../router/pattern-router'
import type { Env, Schema } from '../types'

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
