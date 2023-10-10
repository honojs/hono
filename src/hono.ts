import { HonoBase } from './hono-base'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { TrieRouter } from './router/trie-router'
import type { Env, Schema } from './types'

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
    this.router =
      init.router ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
  }
}
