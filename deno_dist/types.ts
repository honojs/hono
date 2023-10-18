/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context.ts'
import type { Hono } from './hono.ts'
import type { StatusCode } from './utils/http-status.ts'
import type { IntersectNonAnyTypes, UnionToIntersection } from './utils/types.ts'

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

////////////////////////////////////////
//////                            //////
//////          Handlers          //////
//////                            //////
////////////////////////////////////////

type HandlerResponse<O> = Response | TypedResponse<O> | Promise<Response | TypedResponse<O>>

export type Handler<
  E extends Env = any,
  P extends string = any,
  I extends Input = Input,
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
  I extends Input = {},
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
    I extends Input = {},
    R extends HandlerResponse<any> = any,
    E2 extends Env = E
  >(
    handler: H<E2, P, I, R>
  ): Hono<E, S & ToSchema<M, P, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(handler, handler)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = {},
    R extends HandlerResponse<any> = any,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    ...handlers: [H<E2, P, I, R>, H<E3, P, I, R>]
  ): Hono<E, S & ToSchema<M, P, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(handler x 3)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    ...handlers: [H<E2, P, I, R>, H<E3, P, I2, R>, H<E4, P, I3, R>]
  ): Hono<E, S & ToSchema<M, P, I3['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(handler x 4)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>
  >(
    ...handlers: [H<E2, P, I, R>, H<E3, P, I2, R>, H<E4, P, I3, R>, H<E5, P, I3, R>]
  ): Hono<E, S & ToSchema<M, P, I4['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(handler x 5)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    ...handlers: [
      H<E2, P, I, R>,
      H<E3, P, I2, R>,
      H<E4, P, I3, R>,
      H<E5, P, I3, R>,
      H<E6, P, I3, R>
    ]
  ): Hono<E, S & ToSchema<M, P, I5['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(...handlers[])
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = {},
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
    P2 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    E2 extends Env = E
  >(
    path: P,
    handler: H<E2, MergePath<BasePath, P2>, I, R>
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler, handler)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    path: P,
    ...handlers: [H<E2, MergePath<BasePath, P2>, I, R>, H<E3, MergePath<BasePath, P3>, I, R>]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x3)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x4)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
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
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>,
      H<E5, MergePath<BasePath, P5>, I4, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, handler x5)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    P6 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>
  >(
    path: P,
    ...handlers: [
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>,
      H<E5, MergePath<BasePath, P5>, I4, R>,
      H<E6, MergePath<BasePath, P6>, I5, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(path, ...handlers[])
  <P extends string, I extends Input = {}, R extends HandlerResponse<any> = any>(
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
  //// app.get(...handlers[])
  <E2 extends Env = E>(
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, ExtractKey<S>>>[]
  ): Hono<E, S, BasePath>

  //// app.get(path, ...handlers[])
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
  // app.on(method, path, handler, handler)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, MergePath<BasePath, P2>, I, R>, H<E3, MergePath<BasePath, P3>, I, R>]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(method, path, handler x3)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>, BasePath>
  // app.get(method, path, handler x4)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
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
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>,
      H<E5, MergePath<BasePath, P5>, I4, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>, BasePath>

  // app.get(method, path, handler x5)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    P6 extends string = P,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
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
      H<E2, MergePath<BasePath, P2>, I, R>,
      H<E3, MergePath<BasePath, P3>, I2, R>,
      H<E4, MergePath<BasePath, P4>, I3, R>,
      H<E5, MergePath<BasePath, P5>, I4, R>,
      H<E6, MergePath<BasePath, P6>, I5, R>
    ]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>, BasePath>

  <M extends string, P extends string, R extends HandlerResponse<any> = any, I extends Input = {}>(
    method: M,
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): Hono<E, S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>, BasePath>

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
      output: {}
    }
  }
}

export type MergeSchemaPath<OrigSchema, SubPath extends string> = {
  [K in keyof OrigSchema as `${MergePath<SubPath, K & string>}`]: OrigSchema[K]
}

export type AddParam<I, P extends string> = ParamKeys<P> extends never
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
  response: Response | Promise<Response>
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
  status: StatusCode
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
  queries: Record<string, string[]> // Deprecated. Will be obsolete in v4.
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
