import { HonoBase } from './hono-base'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { TrieRouter } from './router/trie-router'
import type { Env } from './types'

export class Hono<E extends Env = Env, S = {}, BasePath extends string = '/'> extends HonoBase<
  E,
  S,
  BasePath
> {
  constructor(init: Partial<Pick<Hono, 'router' | 'getPath'> & { strict: boolean }> = {}) {
    super(init)
    this.router =
      init.router ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
  }
}
