/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context.ts'
import type { Hono } from './hono.ts'
import type { IfAnyThenEmptyObject, RemoveBlankRecord, UnionToIntersection } from './utils/types.ts'

////////////////////////////////////////
//////                            //////
//////           Values           //////
//////                            //////
////////////////////////////////////////

export type Bindings = Record<string, unknown>
export type Variables = Record<string, unknown>

export type Env = {
  Bindings?: Bindings
  Variables?: Variables
}

export type Next = () => Promise<void>

export type Input = {
  in?: Partial<ValidationTargets>
  out?: Partial<{ [K in keyof ValidationTargets]: unknown }>
}

export type BlankSchema = {}
export type BlankInput = {}

////////////////////////////////////////
//////                            //////
//////          Routes            //////
//////                            //////
////////////////////////////////////////

export interface RouterRoute {
  path: string
  method: string
  handler: H
}

////////////////////////////////////////
//////                            //////
//////          Handlers          //////
//////                            //////
////////////////////////////////////////

export type HandlerResponse<O> = Response | TypedResponse<O> | Promise<Response | TypedResponse<O>>

export type Handler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
  R extends HandlerResponse<any> = any
> = (c: Context<E, P, I>, next: Next) => R

export type MiddlewareHandler<
  E extends Env = any,
  P extends string = string,
  I extends Input = {}
> = (c: Context<E, P, I>, next: Next) => Promise<Response | void>

export type H<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
  R extends HandlerResponse<any> = any
> = Handler<E, P, I, R> | MiddlewareHandler<E, P, I>

export type NotFoundHandler<E extends Env = any> = (c: Context<E>) => Response | Promise<Response>
export type ErrorHandler<E extends Env = any> = (
  err: Error,
  c: Context<E>
) => Response | Promise<Response>

////////////////////////////////////////
//////                            //////
//////     HandlerInterface       //////
//////                            //////
////////////////////////////////////////

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  //// app.get(...handlers[])

  // app.get(handler)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = BlankInput,
    R extends HandlerResponse<any> = any,
    E2 extends Env = E
  >(
    handler: H<E2, P, I, R>
  ): Hono<
    IntersectNonAnyTypes<[E, E2]>,
    S & ToSchema<M, P, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x2)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    R extends HandlerResponse<any> = any,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    ...handlers: [H<E2, P, I>, H<E3, P, I2, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3]>,
    S & ToSchema<M, P, I2['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 3)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    ...handlers: [H<E2, P, I>, H<E3, P, I2>, H<E4, P, I3, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4]>,
    S & ToSchema<M, P, I3['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 4)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>
  >(
    ...handlers: [H<E2, P, I>, H<E3, P, I2>, H<E4, P, I3>, H<E5, P, I4, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    S & ToSchema<M, P, I4['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 5)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    ...handlers: [H<E2, P, I>, H<E3, P, I2>, H<E4, P, I3>, H<E5, P, I4>, H<E6, P, I5, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    S & ToSchema<M, P, I5['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 6)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>
  >(
    ...handlers: [
      H<E2, P, I>,
      H<E3, P, I2>,
      H<E4, P, I3>,
      H<E5, P, I4>,
      H<E6, P, I5>,
      H<E7, P, I6, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    S & ToSchema<M, P, I6['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 7)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>
  >(
    ...handlers: [
      H<E2, P, I>,
      H<E3, P, I2>,
      H<E4, P, I3>,
      H<E5, P, I4>,
      H<E6, P, I5>,
      H<E7, P, I6>,
      H<E8, P, I7, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S & ToSchema<M, P, I7['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 8)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>
  >(
    ...handlers: [
      H<E2, P, I>,
      H<E3, P, I2>,
      H<E4, P, I3>,
      H<E5, P, I4>,
      H<E6, P, I5>,
      H<E7, P, I6>,
      H<E8, P, I7>,
      H<E9, P, I8, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S & ToSchema<M, P, I8['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 9)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>
  >(
    ...handlers: [
      H<E2, P, I>,
      H<E3, P, I2>,
      H<E4, P, I3>,
      H<E5, P, I4>,
      H<E6, P, I5>,
      H<E7, P, I6>,
      H<E8, P, I7>,
      H<E9, P, I8>,
      H<E10, P, I9, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S & ToSchema<M, P, I9['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(handler x 10)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>
  >(
    ...handlers: [
      H<E2, P, I>,
      H<E3, P, I2>,
      H<E4, P, I3>,
      H<E5, P, I4>,
      H<E6, P, I5>,
      H<E7, P, I6>,
      H<E8, P, I7>,
      H<E9, P, I8>,
      H<E10, P, I9>,
      H<E11, P, I10, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S & ToSchema<M, P, I10['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(...handlers[])
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = BlankInput,
    R extends HandlerResponse<any> = any
  >(
    ...handlers: H<E, P, I, R>[]
  ): Hono<E, S & ToSchema<M, P, I['in'], MergeTypedResponseData<R>>, BasePath>

  ////  app.get(path)

  // app.get(path)
  <P extends string, R extends HandlerResponse<any> = any, I extends Input = {}>(path: P): Hono<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  ////  app.get(path, ...handlers[])

  // app.get(path, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E
  >(
    path: P,
    handler: H<E2, MergedPath, I, R>
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x2)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I2['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x3)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R>]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x4)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x5)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x6)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I6['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x7)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I7['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x8)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I8['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x9)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I9['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x10)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
      H<E11, MergedPath, I10, R>
    ]
  ): Hono<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I10['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, ...handlers[])
  <P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>
}

////////////////////////////////////////
//////                            //////
////// MiddlewareHandlerInterface //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  //// app.use(...handlers[])
  <E2 extends Env = E>(
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, ExtractKey<S>>>[]
  ): Hono<IntersectNonAnyTypes<[E, E2]>, S, BasePath>

  // app.use(handler)
  <E2 extends Env = E>(handler: MiddlewareHandler<E2, MergePath<BasePath, ExtractKey<S>>>): Hono<
    IntersectNonAnyTypes<[E, E2]>,
    S,
    BasePath
  >

  // app.use(handler x2)
  <
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3]>, S, BasePath>

  // app.use(handler x3)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>, MiddlewareHandler<E4, P>]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4]>, S, BasePath>

  // app.use(handler x4)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S, BasePath>

  // app.use(handler x5)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S, BasePath>

  // app.use(handler x6)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S, BasePath>

  // app.use(handler x7)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S, BasePath>

  // app.use(handler x8)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S, BasePath>

  // app.use(handler x9)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>,
      MiddlewareHandler<E10, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S, BasePath>

  // app.use(handler x10)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>,
      MiddlewareHandler<E10, P>,
      MiddlewareHandler<E11, P>
    ]
  ): Hono<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S, BasePath>

  //// app.use(path, ...handlers[])
  <P extends string, E2 extends Env = E>(
    path: P,
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, P>>[]
  ): Hono<E, S, BasePath>
}

////////////////////////////////////////
//////                            //////
//////     OnHandlerInterface     //////
//////                            //////
////////////////////////////////////////

export interface OnHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  // app.on(method, path, handler)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E
  >(
    method: M,
    path: P,
    handler: H<E2, MergedPath, I, R>
  ): Hono<
    IntersectNonAnyTypes<[E, E2]>,
    S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x2)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3]>,
    S & ToSchema<M, MergePath<BasePath, P>, I2['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x3)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4]>,
    S & ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x4)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    S & ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x5)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    S & ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x6)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    S & ToSchema<M, MergePath<BasePath, P>, I6['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x7)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S & ToSchema<M, MergePath<BasePath, P>, I7['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x8)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S & ToSchema<M, MergePath<BasePath, P>, I8['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x9)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S & ToSchema<M, MergePath<BasePath, P>, I9['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x10)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
      H<E11, MergedPath, I10>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I10['in'], MergeTypedResponseData<HandlerResponse<any>>>,
    BasePath
  >

  // app.get(method, path, ...handler)
  <M extends string, P extends string, R extends HandlerResponse<any> = any, I extends Input = {}>(
    method: M,
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(method[], path, handler)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E
  >(
    methods: Ms,
    path: P,
    handler: H<E2, MergedPath, I, R>
  ): Hono<
    IntersectNonAnyTypes<[E, E2]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x2)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I2['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x3)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R>]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x4)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x5)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x6)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I6['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x7)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I7['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x8)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8, R>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S & ToSchema<Ms[number], MergePath<BasePath, P>, I8['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler x9)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I9['in'],
        MergeTypedResponseData<HandlerResponse<any>>
      >,
    BasePath
  >

  // app.get(method[], path, handler x10)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
      H<E11, MergedPath, I10>
    ]
  ): Hono<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I10['in'],
        MergeTypedResponseData<HandlerResponse<any>>
      >,
    BasePath
  >

  // app.on(method[], path, ...handler)
  <P extends string, R extends HandlerResponse<any> = any, I extends Input = {}>(
    methods: string[],
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): Hono<
    E,
    S & ToSchema<string, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method | method[], path[], ...handlers[])
  <I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    methods: string | string[],
    paths: string[],
    ...handlers: H<E, any, I, R>[]
  ): Hono<E, S & ToSchema<string, string, I['in'], MergeTypedResponseData<R>>, BasePath>
}

type ExtractKey<S> = S extends Record<infer Key, unknown>
  ? Key extends string
    ? Key
    : never
  : string

////////////////////////////////////////
//////                            //////
//////           ToSchema           //////
//////                            //////
////////////////////////////////////////

export type ToSchema<M extends string, P extends string, I extends Input['in'], O> = {
  [K in P]: {
    [K2 in M as AddDollar<K2>]: {
      input: unknown extends I ? AddParam<{}, P> : AddParam<I, P>
      output: unknown extends O ? {} : O
    }
  }
}

export type Schema = {
  [Path: string]: {
    [Method: `$${Lowercase<string>}`]: {
      input: Partial<ValidationTargets> & {
        param?: Record<string, string>
      }
      output: any
    }
  }
}

type ExtractParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${infer Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string }
  : Path extends `${infer Start}:${infer Param}`
  ? { [K in Param]: string }
  : never

type FlattenIfIntersect<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

export type MergeSchemaPath<OrigSchema extends Schema, SubPath extends string> = {
  [P in keyof OrigSchema as MergePath<SubPath, P & string>]: {
    [M in keyof OrigSchema[P]]: OrigSchema[P][M] extends {
      input: infer Input
      output: infer Output
    }
      ? {
          input: Input extends { param: infer _ }
            ? ExtractParams<SubPath> extends never
              ? Input
              : FlattenIfIntersect<
                  Input & {
                    param: {
                      // Maps extracted keys, stripping braces, to a string-typed record.
                      [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}`
                        ? Prefix
                        : K]: string
                    }
                  }
                >
            : RemoveBlankRecord<ExtractParams<SubPath>> extends never
            ? Input
            : Input & {
                // Maps extracted keys, stripping braces, to a string-typed record.
                param: {
                  [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}`
                    ? Prefix
                    : K]: string
                }
              }
          output: Output
        }
      : never
  }
}

export type AddParam<I, P extends string> = ParamKeys<P> extends never
  ? I
  : I extends { param: infer _ }
  ? I
  : I & { param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>> }

type AddDollar<T extends string> = `$${Lowercase<T>}`

export type MergePath<A extends string, B extends string> = A extends ''
  ? B
  : A extends '/'
  ? B
  : A extends `${infer P}/`
  ? B extends `/${infer Q}`
    ? `${P}/${Q}`
    : `${P}/${B}`
  : B extends `/${infer Q}`
  ? Q extends ''
    ? A
    : `${A}/${Q}`
  : `${A}/${B}`

////////////////////////////////////////
//////                            //////
//////        TypedResponse       //////
//////                            //////
////////////////////////////////////////

export type TypedResponse<T = unknown> = {
  data: T
  format: 'json' // Currently, support only `json` with `c.json()`
}

type ExtractResponseData<T> = T extends Promise<infer T2>
  ? T2 extends TypedResponse<infer U>
    ? U
    : {}
  : T extends TypedResponse<infer U>
  ? U
  : {}

type MergeTypedResponseData<T> = ExtractResponseData<T>

////////////////////////////////////////
//////                             /////
//////      ValidationTargets      /////
//////                             /////
////////////////////////////////////////

export type ValidationTargets = {
  json: any
  form: Record<string, string | File>
  query: Record<string, string | string[]>
  param: Record<string, string>
  header: Record<string, string>
  cookie: Record<string, string>
}

////////////////////////////////////////
//////                            //////
//////      Path parameters       //////
//////                            //////
////////////////////////////////////////

type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer Rest}`
  ? Rest extends `${infer _Pattern}?`
    ? `${Name}?`
    : Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

export type ParamKeyToRecord<T extends string> = T extends `${infer R}?`
  ? Record<R, string | undefined>
  : { [K in T]: string }

////////////////////////////////////////
//////                            //////
/////       For HonoRequest       //////
//////                            //////
////////////////////////////////////////

export type InputToDataByTarget<
  T extends Input['out'],
  Target extends keyof ValidationTargets
> = T extends {
  [K in Target]: infer R
}
  ? R
  : never

export type RemoveQuestion<T> = T extends `${infer R}?` ? R : T

export type UndefinedIfHavingQuestion<T> = T extends `${infer _}?` ? string | undefined : string

////////////////////////////////////////
//////                            //////
//////         Utilities          //////
//////                            //////
////////////////////////////////////////

export type ExtractSchema<T> = UnionToIntersection<
  T extends Hono<infer _, infer S, any> ? S : never
>

type EnvOrEmpty<T> = T extends Env ? (Env extends T ? {} : T) : T
type IntersectNonAnyTypes<T extends any[]> = T extends [infer Head, ...infer Rest]
  ? IfAnyThenEmptyObject<EnvOrEmpty<Head>> & IntersectNonAnyTypes<Rest>
  : {}

////////////////////////////////////////
//////                            //////
//////         FetchEvent         //////
//////                            //////
////////////////////////////////////////

export abstract class FetchEventLike {
  abstract readonly request: Request
  abstract respondWith(promise: Response | Promise<Response>): void
  abstract passThroughOnException(): void
  abstract waitUntil(promise: Promise<void>): void
}
