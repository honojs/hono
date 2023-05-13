import { HonoBase } from '../hono-base'
import { PatternRouter } from '../router/pattern-router'
import type { Env } from '../types'

export class Hono<E extends Env = Env, S = {}, BasePath extends string = '/'> extends HonoBase<
  E,
  S,
  BasePath
> {
  constructor() {
    super()
    this.router = new PatternRouter()
  }
}
