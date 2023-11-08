import type { Env, Input, MiddlewareHandler } from '../../types.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMiddleware = <E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
) => middleware
