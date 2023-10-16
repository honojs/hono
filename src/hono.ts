import { HonoBase } from './hono-base'
import type { HonoOptions } from './hono-base'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { TrieRouter } from './router/trie-router'
import type { Env, Schema } from './types'

export class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(options: HonoOptions<E, BasePath> = {}) {
    super(options)
    this.router =
      options.router ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
  }
}
