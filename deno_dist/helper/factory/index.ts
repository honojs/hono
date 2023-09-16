import type { Env, Input, MiddlewareHandler } from '../../types.ts'

/**
 * @experimental
 * `middleware()` is an experimental feature.
 * The API might be changed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const middleware = <E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
) => middleware
