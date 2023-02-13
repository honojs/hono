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

export interface HandlerInterface<E extends Env = Env, M extends string = any, S = {}> {
  //// app.get(...handlers[])

  // app.get(handler, handler)
  <I = {}, O = {}>(...handlers: [H<E, ExtractKey<S>, I, O>, H<E, ExtractKey<S>, I, O>]): Hono<
    E,
    S & Schema<M, ExtractKey<S>, I, O>
  >

  // app.get(handler x 3)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    ...handlers: [H<E, ExtractKey<S>, I, O>, H<E, ExtractKey<S>, I2, O>, H<E, ExtractKey<S>, I3, O>]
  ): Hono<E, S & Schema<M, ExtractKey<S>, I3, O>>

  // app.get(handler x 4)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    ...handlers: [
      H<E, ExtractKey<S>, I, O>,
      H<E, ExtractKey<S>, I2, O>,
      H<E, ExtractKey<S>, I3, O>,
      H<E, ExtractKey<S>, I4, O>
    ]
  ): Hono<E, S & Schema<M, ExtractKey<S>, I4, O>>

  // app.get(handler x 5)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3, I5 = I3 & I4>(
    ...handlers: [
      H<E, ExtractKey<S>, I, O>,
      H<E, ExtractKey<S>, I2, O>,
      H<E, ExtractKey<S>, I3, O>,
      H<E, ExtractKey<S>, I4, O>,
      H<E, ExtractKey<S>, I5, O>
    ]
  ): Hono<E, S & Schema<M, ExtractKey<S>, I5, O>>

  // app.get(...handlers[])
  <I = {}, O = {}>(...handlers: Handler<E, ExtractKey<S>, I, O>[]): Hono<
    E,
    S & Schema<M, ExtractKey<S>, I, O>
  >

  ////  app.get(path, ...handlers[])

  // app.get(path, handler, handler)
  <P extends string, O = {}, I = {}>(path: P, ...handlers: [H<E, P, I, O>, H<E, P, I, O>]): Hono<
    E,
    S & Schema<M, P, I, O>
  >

  // app.get(path, handler x3)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>]
  ): Hono<E, S & Schema<M, P, I3, O>>

  // app.get(path, handler x4)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>, H<E, P, I4, O>]
  ): Hono<E, S & Schema<M, P, I4, O>>

  // app.get(path, handler x5)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3, I5 = I3 & I4>(
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>, H<E, P, I4, O>, H<E, P, I5, O>]
  ): Hono<E, S & Schema<M, P, I5, O>>

  // app.get(path, ...handlers[])
  <P extends string, I = {}, O = {}>(path: P, ...handlers: H<E, P, I, O>[]): Hono<
    E,
    S & Schema<M, P, I, O>
  >
}

////////////////////////////////////////
//////                            //////
////// MiddlewareHandlerInterface //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareHandlerInterface<E extends Env = Env, S = {}> {
  //// app.get(...handlers[])
  (...handlers: MiddlewareHandler<E, ExtractKey<S>>[]): Hono<E, S>
  //// app.get(path, ...handlers[])
  <P extends string>(path: P, ...handlers: MiddlewareHandler<E, P>[]): Hono<E, S>
}

////////////////////////////////////////
//////                            //////
//////     OnHandlerInterface     //////
//////                            //////
////////////////////////////////////////

export interface OnHandlerInterface<E extends Env = Env, S = {}> {
  // app.on(method, path, handler, handler)
  <M extends string, P extends string, O = {}, I = {}>(
    method: M,
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I, O>]
  ): Hono<E, S & Schema<M, P, I, O>>

  // app.get(method, path, handler x3)
  <M extends string, P extends string, O = {}, I = {}, I2 = I, I3 = I & I2>(
    method: M,
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>]
  ): Hono<E, S & Schema<M, P, I3, O>>

  // app.get(method, path, handler x4)
  <M extends string, P extends string, O = {}, I = {}, I2 = I, I3 = I & I2, I4 = I2 & I3>(
    method: M,
    path: P,
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>, H<E, P, I4, O>]
  ): Hono<E, S & Schema<M, P, I4, O>>

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
    ...handlers: [H<E, P, I, O>, H<E, P, I2, O>, H<E, P, I3, O>, H<E, P, I4, O>, H<E, P, I5, O>]
  ): Hono<E, S & Schema<M, P, I5, O>>

  <M extends string, P extends string, O extends {} = {}, I = {}>(
    method: M,
    path: P,
    ...handlers: H<E, P, I, O>[]
  ): Hono<E, S & Schema<M, P, I, O>>

  // app.on(method[], path, ...handler)
  <P extends string, O extends {} = {}, I = {}>(
    methods: string[],
    path: P,
    ...handlers: H<E, P, I, O>[]
  ): Hono<E, S & Schema<string, P, I, O>>
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
//////                            //////
//////      ValidationTypes       //////
//////                            //////
////////////////////////////////////////

export type ValidationTypes = {
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

export type InputToDataByType<T extends Input, Type extends keyof ValidationTypes> = T extends {
  [K in Type]: infer R
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
