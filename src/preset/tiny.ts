/**
 * @module
 * The preset that uses `PatternRouter`.
 */

import { HonoBase } from '../hono-base'
import type { HonoOptions } from '../hono-base'
import { PatternRouter } from '../router/pattern-router'
import type { BlankEnv, BlankSchema, Env, Schema } from '../types'

export class Hono<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  BasePath extends string = '/',
> extends HonoBase<E, S, BasePath> {
  constructor(options: HonoOptions<E> = {}) {
    super(options)
    this.router = new PatternRouter()
  }
}
