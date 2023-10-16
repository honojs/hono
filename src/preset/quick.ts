import { HonoBase } from '../hono-base'
import { LinearRouter } from '../router/linear-router'
import { SmartRouter } from '../router/smart-router'
import { TrieRouter } from '../router/trie-router'
import type { Env, Schema } from '../types'

export class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  constructor(init: Partial<Pick<Hono, 'getPath'> & { strict: boolean }> = {}) {
    super(init)
    this.router = new SmartRouter({
      routers: [new LinearRouter(), new TrieRouter()],
    })
  }
}
