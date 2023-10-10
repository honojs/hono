import { HonoBase } from '../hono-base'
import { PatternRouter } from '../router/pattern-router'
import type { Env, Schema } from '../types'

export class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(
    init: Exclude<ConstructorParameters<typeof HonoBase>[0], 'basePath'> & {
      basePath?: BasePath
    } = {}
  ) {
    super(init)
    this.router = new PatternRouter()
  }
}
