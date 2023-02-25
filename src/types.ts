/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context'
import type { Hono } from './hono'
import type { UnionToIntersection } from './utils/types'

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

export type Input = unknown

////////////////////////////////////////
//////                            //////
//////          Handlers          //////
//////                            //////
////////////////////////////////////////

export type Handler<
  E extends Env = any,
  P extends string = any,
  I extends Input = Input,
  O = {}
> = (
  c: Context<E, P, I>,
  next: Next
) => Response | Promise<Response | TypedResponse<O>> | TypedResponse<O>

export type MiddlewareHandler<E extends Env = any, P extends string = any, I extends Input = {}> = (
  c: Context<E, P, I>,
  next: Next
) => Promise<Response | void>

export type H<E extends Env = any, P extends string = any, I extends Input = {}, O = {}> =
  | Handler<E, P, I, O>
  | MiddlewareHandler<E, P, I>

export type NotFoundHandler<E extends Env = any> = (c: Context<E>) => Response | Promise<Response>
export type ErrorHandler<E extends Env = any> = (err: Error, c: Context<E>) => Response

////////////////////////////////////////
//////                            //////
//////     HandlerInterface       //////
//////                            //////
////////////////////////////////////////

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = any,
  S = {},
  BasePath extends string = ''
> {
  //// app.get(...handlers[])

  // app.get(handler, handler)
  <I = {}, O = {}>(...handlers: [H<E, ExtractKey<S>, I, O>, H<E, ExtractKey<S>, I, O>]): Hono<
    E,
    RemoveBlankRecord<S | Schema<M, ExtractKey<S>, I, O>>
  >

  // app.get(handler x 3)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    ...handlers: [H<E, ExtractKey<S>, I, O>, H<E, ExtractKey<S>, I2, O>, H<E, ExtractKey<S>, I3, O>]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, ExtractKey<S>, I3, O>>>

  // app.get(handler x 4)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    ...handlers: [
      H<E, ExtractKey<S>, I, O>,
      H<E, ExtractKey<S>, I2, O>,
      H<E, ExtractKey<S>, I3, O>,
      H<E, ExtractKey<S>, I4, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, ExtractKey<S>, I4, O>>>

  // app.get(handler x 5)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3, I5 = I3 & I4>(
    ...handlers: [
      H<E, ExtractKey<S>, I, O>,
      H<E, ExtractKey<S>, I2, O>,
      H<E, ExtractKey<S>, I3, O>,
      H<E, ExtractKey<S>, I4, O>,
      H<E, ExtractKey<S>, I5, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, ExtractKey<S>, I5, O>>>

  // app.get(...handlers[])
  <I = {}, O = {}>(...handlers: Handler<E, ExtractKey<S>, I, O>[]): Hono<
    E,
    RemoveBlankRecord<S | Schema<M, ExtractKey<S>, I, O>>
  >

  ////  app.get(path, ...handlers[])

  // app.get(path, handler, handler)
  <P extends string, O = {}, I = {}>(path: P, ...handlers: [H<E, P, I, O>, H<E, P, I, O>]): Hono<
    E,
    RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I, O>>
  >

  // app.get(path, handler x3)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, P, I3, O>>>

  // app.get(path, handler x4)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>,
      H<E, MergePath<BasePath, P>, I4, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, P, I4, O>>>

  // app.get(path, handler x5)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3, I5 = I3 & I4>(
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>,
      H<E, MergePath<BasePath, P>, I4, O>,
      H<E, MergePath<BasePath, P>, I5, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, P, I5, O>>>

  // app.get(path, ...handlers[])
  <P extends string, I = {}, O = {}>(
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, O>[]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I, O>>>
}

////////////////////////////////////////
//////                            //////
////// MiddlewareHandlerInterface //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareHandlerInterface<
  E extends Env = Env,
  S = {},
  BasePath extends string = ''
> {
  //// app.get(...handlers[])
  (...handlers: MiddlewareHandler<E, MergePath<BasePath, ExtractKey<S>>>[]): Hono<E, S, BasePath>
  //// app.get(path, ...handlers[])
  <P extends string>(path: P, ...handlers: MiddlewareHandler<E, MergePath<BasePath, P>>[]): Hono<
    E,
    S,
    BasePath
  >
}

////////////////////////////////////////
//////                            //////
//////     OnHandlerInterface     //////
//////                            //////
////////////////////////////////////////

export interface OnHandlerInterface<E extends Env = Env, S = {}, BasePath extends string = ''> {
  // app.on(method, path, handler, handler)
  <M extends string, P extends string, O = {}, I = {}>(
    method: M,
    path: P,
    ...handlers: [H<E, MergePath<BasePath, P>, I, O>, H<E, MergePath<BasePath, P>, I, O>]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I, O>>, BasePath>

  // app.get(method, path, handler x3)
  <M extends string, P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    method: M,
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I3, O>>, BasePath>

  // app.get(method, path, handler x4)
  <M extends string, P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    method: M,
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>,
      H<E, MergePath<BasePath, P>, I4, O>
    ]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I4, O>>, BasePath>

  // app.get(method, path, handler x5)
  <
    M extends string,
    P extends string,
    O = {},
    I = {},
    I2 = I,
    I3 = I & I2,
    I4 = I2 & I3,
    I5 = I3 & I4
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E, MergePath<BasePath, P>, I, O>,
      H<E, MergePath<BasePath, P>, I2, O>,
      H<E, MergePath<BasePath, P>, I3, O>,
      H<E, MergePath<BasePath, P>, I4, O>,
      H<E, MergePath<BasePath, P>, I5, O>
    ]
  ): Hono<E, S | Schema<M, MergePath<BasePath, P>, I5, O>, BasePath>

  <M extends string, P extends string, O extends {} = {}, I = {}>(
    method: M,
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, O>[]
  ): Hono<E, RemoveBlankRecord<S | Schema<M, MergePath<BasePath, P>, I, O>>, BasePath>

  // app.on(method[], path, ...handler)
  <P extends string, O extends {} = {}, I = {}>(
    methods: string[],
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, O>[]
  ): Hono<E, RemoveBlankRecord<S | Schema<string, MergePath<BasePath, P>, I, O>>, BasePath>
}

type ExtractKey<S> = S extends Record<infer Key, unknown>
  ? Key extends string
    ? Key
    : never
  : string

////////////////////////////////////////
//////                            //////
//////           Schema           //////
//////                            //////
////////////////////////////////////////

export type Schema<M extends string, P extends string, I extends Input, O> = {
  [K in P]: AddDollar<{ [K2 in M]: { input: AddParam<I, P>; output: O } }>
}

export type AddParam<I, P extends string> = ParamKeys<P> extends never
  ? I
  : I & { param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>> }

export type AddDollar<T> = T extends Record<infer K, infer R>
  ? K extends string
    ? { [MethodName in `$${Lowercase<K>}`]: R }
    : never
  : never

export type MergeSchemaPath<S, P extends string> = S extends Record<infer Key, infer T>
  ? Key extends string
    ? Record<MergePath<P, Key>, T>
    : never
  : never

export type MergePath<A extends string, B extends string> = A extends ''
  ? B
  : A extends `${infer P}/`
  ? B extends `/${infer Q}`
    ? `${P}/${Q}`
    : `${P}/${B}`
  : B extends `/${infer Q}`
  ? `${A}/${Q}`
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
}

////////////////////////////////////////
//////                             /////
//////      ValidationTargets      /////
//////                             /////
////////////////////////////////////////

export type ValidationTargets = {
  json: any
  form: Record<string, string | File>
  query: Record<string, string>
  queries: Record<string, string[]>
}

////////////////////////////////////////
//////                            //////
//////      Path parameters       //////
//////                            //////
////////////////////////////////////////

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
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
  T extends Input,
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

export type ExtractSchema<T> = T extends Hono<infer _, infer S> ? S : never

export type RemoveBlankRecord<T> = T extends Record<infer K, unknown>
  ? K extends string
    ? T
    : never
  : never
