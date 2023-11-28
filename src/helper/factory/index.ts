/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Env, Input, MiddlewareHandler, H, HandlerResponse } from '../../types'

export class Factory<E extends Env = any, P extends string = any> {
  createMiddleware = <I extends Input = {}>(middleware: MiddlewareHandler<E, P, I>) => middleware

  createHandlers<I extends Input = {}>(handler1: H<E, P, I>): [H<E, P, I>]
  createHandlers<I extends Input = {}, I2 extends Input = I, R extends HandlerResponse<any> = any>(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>]

  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>, H<E, P, I3, R>]

  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>, H<E, P, I3, R>, H<E, P, I4, R>]

  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>, H<E, P, I3, R>, H<E, P, I4, R>]

  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>, H<E, P, I3, R>, H<E, P, I4, R>, H<E, P, I5, R>]

  createHandlers(handler1: H, handler2?: H, handler3?: H, handler4?: H, handler5?: H) {
    return [handler1, handler2, handler3, handler4, handler5]
  }
}

export const createFactory = <E extends Env = any, P extends string = any>() => new Factory<E, P>()
export const createMiddleware = <E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler
) => createFactory<E, P>().createMiddleware<I>(middleware)
