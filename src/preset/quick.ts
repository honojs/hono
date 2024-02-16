import { HonoBase } from '../hono-base'
import type { HonoOptions } from '../hono-base'
import { LinearRouter } from '../router/linear-router'
import { SmartRouter } from '../router/smart-router'
import { TrieRouter } from '../router/trie-router'
import type { BlankSchema, Env, Schema } from '../types'

export class Hono<
  E extends Env = Env,
  S extends Schema = BlankSchema,
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(options: HonoOptions<E> = {}) {
    super(options)
    this.router = new SmartRouter({
      routers: [new LinearRouter(), new TrieRouter()],
    })
  }
}
