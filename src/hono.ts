import { HonoBase } from './hono-base'
import type { HonoOptions } from './hono-base'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { TrieRouter } from './router/trie-router'
import type { BlankEnv, BlankSchema, Env, Schema } from './types'

/**
 * The Hono class extends the functionality of the HonoBase class.
 * It sets up routing and allows for custom options to be passed.
 *
 * @template E - The environment type.
 * @template S - The schema type.
 * @template BasePath - The base path type.
 */
export class Hono<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options: HonoOptions<E> = {}) {
    super(options)
    this.router =
      options.router ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
  }
}
