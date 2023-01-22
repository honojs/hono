/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context'
import type { Hono } from './hono'
import type { UnionToIntersection } from './utils/types'

export type Bindings = Record<string, unknown>
export type Variables = Record<string, unknown>

export type Env = {
  Bindings?: Bindings
  Variables?: Variables
}

export type Handler<E extends Env = any, P extends string = any, I = {}, O = {}> = (
  c: Context<E, P, I>,
  next: Next
) => Response | Promise<Response | TypeResponse<O> | void> | TypeResponse<O> | void

export type MiddlewareHandler<E extends Env = any, P extends string = any, I = {}> = (
  c: Context<E, P, I>,
  next: Next
) => Promise<Response | undefined | void>

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = any,
  S extends string = string
> {
  // app.get(...handler)
  <I = {}, O = {}>(...handlers: Handler<E, S, I, O>[]): Hono<E, S, M, I, O>
  // app.get(path, handler, handler)
  <P extends string, O = {}, I = {}>(
    path: P,
    ...handlers: [Handler<E, P, I, O>, Handler<E, P, I, O>]
  ): Hono<E, P, M, I, O>
  // app.get(path, handler x3)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I | I2>(
    path: P,
    ...handlers: [Handler<E, P, I, O>, Handler<E, P, I2, O>, Handler<E, P, I3, O>]
  ): Hono<E, P, M, I3, O>
  // app.get(path, handler x4)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I | I2, I4 = I2 | I3>(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>
    ]
  ): Hono<E, P, M, I4, O>
  // app.get(path, handler x5)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I | I2, I4 = I2 | I3, I5 = I3 | I4>(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>
    ]
  ): Hono<E, P, M, I5, O>
  // app.get(path, handler x6)
  <P extends string, O = {}, I = {}, I2 = I, I3 = I | I2, I4 = I2 | I3, I5 = I3 | I4, I6 = I4 | I5>(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>,
      Handler<E, P, I6, O>
    ]
  ): Hono<E, P, M, I6, O>
  // app.get(path, handler x7)
  <
    P extends string,
    O = {},
    I = {},
    I2 = I,
    I3 = I | I2,
    I4 = I2 | I3,
    I5 = I3 | I4,
    I6 = I4 | I5,
    I7 = I5 | I6
  >(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>,
      Handler<E, P, I6, O>,
      Handler<E, P, I7, O>
    ]
  ): Hono<E, P, M, I7, O>
  // app.get(path, handler x8)
  <
    P extends string,
    O = {},
    I = {},
    I2 = I,
    I3 = I | I2,
    I4 = I2 | I3,
    I5 = I3 | I4,
    I6 = I4 | I5,
    I7 = I5 | I6,
    I8 = I6 | I7
  >(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>,
      Handler<E, P, I6, O>,
      Handler<E, P, I7, O>,
      Handler<E, P, I8, O>
    ]
  ): Hono<E, P, M, I8, O>
  // app.get(path, handler x9)
  <
    P extends string,
    O = {},
    I = {},
    I2 = I,
    I3 = I | I2,
    I4 = I2 | I3,
    I5 = I3 | I4,
    I6 = I4 | I5,
    I7 = I5 | I6,
    I8 = I6 | I7,
    I9 = I7 | I8
  >(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>,
      Handler<E, P, I6, O>,
      Handler<E, P, I7, O>,
      Handler<E, P, I8, O>,
      Handler<E, P, I9, O>
    ]
  ): Hono<E, P, M, I9, O>
  // app.get(path, handler x10)
  <
    P extends string,
    O = {},
    I = {},
    I2 = I,
    I3 = I | I2,
    I4 = I2 | I3,
    I5 = I3 | I4,
    I6 = I4 | I5,
    I7 = I5 | I6,
    I8 = I6 | I7,
    I9 = I7 | I8,
    I10 = I8 | I9
  >(
    path: P,
    ...handlers: [
      Handler<E, P, I, O>,
      Handler<E, P, I2, O>,
      Handler<E, P, I3, O>,
      Handler<E, P, I4, O>,
      Handler<E, P, I5, O>,
      Handler<E, P, I6, O>,
      Handler<E, P, I7, O>,
      Handler<E, P, I8, O>,
      Handler<E, P, I9, O>,
      Handler<E, P, I10, O>
    ]
  ): Hono<E, P, M, I10, O>
  // app.get(path, ...handler)
  <P extends string, I = {}, O = {}>(path: P, ...handlers: Handler<E, P, I, O>[]): Hono<
    E,
    P,
    M,
    I,
    O
  >
}

export type ExtractType<T> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R>>
  ? R
  : never

export type NotFoundHandler<E extends Env = any> = (c: Context<E>) => Response | Promise<Response>

export type ErrorHandler<E extends Env = any> = (err: Error, c: Context<E>) => Response

export type Next = () => Promise<void>

export type TypeResponse<T = unknown> = {
  response: Response | Promise<Response>
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
}

// This is not used for internally
// Will be used by users as `Handler`
export interface CustomHandler<E = Env, P = any, I = any, O = any> {
  (
    c: Context<
      E extends Env ? E : Env,
      E extends string ? E : P extends string ? P : never,
      E extends Env
        ? P extends string
          ? I
          : E extends Env
          ? E
          : never
        : E extends string
        ? P extends Env
          ? E
          : P
        : E
    >,
    next: Next
  ): Response | Promise<Response | TypeResponse<O>> | TypeResponse<O>
}

export type ValidationTypes = {
  json: object
  form: Record<string, string | File>
  query: Record<string, string>
  queries: Record<string, string[]>
}

export type ToAppType<T> = T extends Hono<infer _, infer P, infer M, infer I, infer O>
  ? ToAppTypeInner<P, M, I, O>
  : never

type RemoveBlank<T> = {
  [K in keyof T]: T extends { type: ValidationTypes } ? T : never
}

type InputSchema = {
  [K in string]: { type: ValidationTypes; data: unknown }
}

type ToAppTypeInner<P extends string, M extends string, I, O> = RemoveBlank<I> extends InputSchema
  ? {
      [K in M]: {
        [K2 in P]: {
          input: UnionToIntersection<
            I extends { type: keyof ValidationTypes; data: unknown }
              ? I extends { type: infer R }
                ? R extends string
                  ? { [K in R]: I['data'] }
                  : never
                : never
              : never
          >
          output: O extends Record<string, never> ? unknown : { json: O } // Currently, support only JSON
        }
      }
    }
  : { output: O extends Record<string, never> ? unknown : { json: O } }

export type InputToData<T> = ExtractData<T> extends never
  ? any
  : UnionToIntersection<ExtractData<T>>
type ExtractData<T> = T extends { type: keyof ValidationTypes }
  ? T extends { type: keyof ValidationTypes; data?: infer R }
    ? R
    : any
  : T
