import type { Env, Input, MiddlewareHandler } from '../../types'

/**
 * @experimental
 * `middleware()` is an experimental feature.
 * The API might be changed.
 */
export const middleware = <E extends Env = {}, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
) => middleware
