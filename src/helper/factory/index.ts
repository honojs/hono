import type { Env, Input, MiddlewareHandler, SyncMiddlewareHandler } from '../../types'

type CreateMIddleware = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <E extends Env = any, P extends string = any, I extends Input = {}>(
    middleware: MiddlewareHandler<E, P, I>
  ): MiddlewareHandler<E, P, I>
  <E extends Env = any, P extends string = any, I extends Input = {}>(
    hook: 'after' | 'before',
    middleware: SyncMiddlewareHandler<E, P, I>
  ): MiddlewareHandler<E, P, I>
}
export const createMiddleware: CreateMIddleware = (...args: any[]) => {
  if (args.length === 1) {
    return args[0]
  } else {
    args[1][args[0]] = true
    return args[1]
  }
}
