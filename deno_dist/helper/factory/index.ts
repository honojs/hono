import type { Env, Input, MiddlewareHandler } from '../../types.ts'

/**
 * @experimental
 * `middleware()` is an experimental feature.
 * The API might be changed.
 */
export const middleware = <E extends Env = Env, P extends string = string, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
) => middleware
