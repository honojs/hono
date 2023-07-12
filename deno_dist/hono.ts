import { HonoBase } from './hono-base.ts'
import { RegExpRouter } from './router/reg-exp-router/index.ts'
import { SmartRouter } from './router/smart-router/index.ts'
import { TrieRouter } from './router/trie-router/index.ts'
import type { Env } from './types.ts'

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
