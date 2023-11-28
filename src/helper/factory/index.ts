/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Env, Input, MiddlewareHandler, H, HandlerResponse } from '../../types'

/**
 * @experimental
 * `Factory` class is an experimental feature.
 * The API might be changed.
 */
export class Factory<E extends Env = any, P extends string = any> {
  createMiddleware = <I extends Input = {}>(middleware: MiddlewareHandler<E, P, I>) => middleware

  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
  createHandlers<I extends Input = {}>(handler1: H<E, P, I>): [H<E, P, I>]

  // handler x2
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
  createHandlers<I extends Input = {}, I2 extends Input = I, R extends HandlerResponse<any> = any>(
    handler1: H<E, P, I, R>,
    handler2: H<E, P, I2, R>
  ): [H<E, P, I, R>, H<E, P, I2, R>]

  // handler x3
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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
  /**
   * @experimental
   * `createHandlers` is an experimental feature.
   * The API might be changed.
   */
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

  createHandlers(
    handler1: H,
    handler2?: H,
    handler3?: H,
    handler4?: H,
    handler5?: H,
    handler6?: H,
    handler7?: H,
    handler8?: H,
    handler9?: H,
    handler10?: H
  ) {
    return [
      handler1,
      handler2,
      handler3,
      handler4,
      handler5,
      handler6,
      handler7,
      handler8,
      handler9,
      handler10,
    ]
  }
}

/**
 * @experimental
 * `createFactory` is an experimental feature.
 * The API might be changed.
 */
export const createFactory = <E extends Env = any, P extends string = any>() => new Factory<E, P>()

export const createMiddleware = <E extends Env = any, P extends string = any, I extends Input = {}>(
  middleware: MiddlewareHandler
) => createFactory<E, P>().createMiddleware<I>(middleware)
