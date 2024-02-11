/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Env, H, HandlerResponse, Input, MiddlewareHandler } from '../../types'

export class Factory<E extends Env = any, P extends string = any> {
  createMiddleware = <I extends Input = {}>(middleware: MiddlewareHandler<E, P, I>) => middleware

  createHandlers<I extends Input = {}, R extends HandlerResponse<any> = any>(
    handler1: H<E, P, I, R>
  ): [H<E, P, I, R>]

  // handler x2
  createHandlers<I extends Input = {}, I2 extends Input = I, R extends HandlerResponse<any> = any>(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>]

  // handler x3
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

  // handler x4
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

  // handler x5
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

  // handler x6
  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>,
    handler6: H<E, P, I6, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>, H<E, P, I3, R>, H<E, P, I4, R>, H<E, P, I5, R>, H<E, P, I6, R>]

  // handler x7
  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>,
    handler6: H<E, P, I6, R>,
    handler7: H<E, P, I7, R>
  ): [
    H<E, P, I, R>,
    H<E, P, I2, R>,
    H<E, P, I3, R>,
    H<E, P, I4, R>,
    H<E, P, I5, R>,
    H<E, P, I6, R>,
    H<E, P, I7, R>
  ]

  // handler x8
  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>,
    handler6: H<E, P, I6, R>,
    handler7: H<E, P, I7, R>,
    handler8: H<E, P, I8, R>
  ): [
    H<E, P, I, R>,
    H<E, P, I2, R>,
    H<E, P, I3, R>,
    H<E, P, I4, R>,
    H<E, P, I5, R>,
    H<E, P, I6, R>,
    H<E, P, I7, R>,
    H<E, P, I8, R>
  ]

  // handler x9
  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>,
    handler6: H<E, P, I6, R>,
    handler7: H<E, P, I7, R>,
    handler8: H<E, P, I8, R>,
    handler9: H<E, P, I9, R>
  ): [
    H<E, P, I, R>,
    H<E, P, I2, R>,
    H<E, P, I3, R>,
    H<E, P, I4, R>,
    H<E, P, I5, R>,
    H<E, P, I6, R>,
    H<E, P, I7, R>,
    H<E, P, I8, R>,
    H<E, P, I9, R>
  ]

  // handler x10
  createHandlers<
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    R extends HandlerResponse<any> = any
  >(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>,
    handler3: H<E, P, I3, R>,
    handler4: H<E, P, I4, R>,
    handler5: H<E, P, I5, R>,
    handler6: H<E, P, I6, R>,
    handler7: H<E, P, I7, R>,
    handler8: H<E, P, I8, R>,
    handler9: H<E, P, I9, R>,
    handler10: H<E, P, I10, R>
  ): [
    H<E, P, I, R>,
    H<E, P, I2, R>,
    H<E, P, I3, R>,
    H<E, P, I4, R>,
    H<E, P, I5, R>,
    H<E, P, I6, R>,
    H<E, P, I7, R>,
    H<E, P, I8, R>,
    H<E, P, I9, R>,
    H<E, P, I10, R>
  ]

  createHandlers(...handlers: H[]) {
    return handlers.filter((handler) => handler !== undefined)
  }
}

export const createFactory = <E extends Env = any, P extends string = any>() => new Factory<E, P>()

export const createMiddleware = <E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler<E, P, I>
) => createFactory<E, P>().createMiddleware<I>(middleware)
