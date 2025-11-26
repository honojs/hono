import type { Hono } from '../hono'
import type { HonoBase } from '../hono-base'
import type { Endpoint, ResponseFormat, Schema } from '../types'
import type { StatusCode, SuccessStatusCode } from '../utils/http-status'
import type { HasRequiredKeys } from '../utils/types'

type HonoRequest = (typeof Hono.prototype)['request']

export type ClientRequestOptions<T = unknown> = {
  fetch?: typeof fetch | HonoRequest
  webSocket?: (...args: ConstructorParameters<typeof WebSocket>) => WebSocket
  /**
   * Standard `RequestInit`, caution that this take highest priority
   * and could be used to overwrite things that Hono sets for you, like `body | method | headers`.
   *
   * If you want to add some headers, use in `headers` instead of `init`
   */
  init?: RequestInit
} & (keyof T extends never
  ? {
      headers?:
        | Record<string, string>
        | (() => Record<string, string> | Promise<Record<string, string>>)
    }
  : {
      headers: T | (() => T | Promise<T>)
    })

export type ClientRequest<Prefix extends string, Path extends string, S extends Schema> = {
  [M in keyof S]: S[M] extends Endpoint & { input: infer R }
    ? R extends object
      ? HasRequiredKeys<R> extends true
        ? (args: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S[M]>>
        : (args?: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S[M]>>
      : never
    : never
} & {
  $url: <
    const Arg extends
      | (S[keyof S] extends { input: infer R }
          ? R extends { param: infer P }
            ? R extends { query: infer Q }
              ? { param: P; query: Q }
              : { param: P }
            : R extends { query: infer Q }
            ? { query: Q }
            : {}
          : {})
      | undefined = undefined
  >(
    arg?: Arg
  ) => HonoURL<Prefix, Path, Arg>
} & (S['$get'] extends { outputFormat: 'ws' }
    ? S['$get'] extends { input: infer I }
      ? {
          $ws: (args?: I) => WebSocket
        }
      : {}
    : {})

type ClientResponseOfEndpoint<T extends Endpoint = Endpoint> = T extends {
  output: infer O
  outputFormat: infer F
  status: infer S
}
  ? ClientResponse<O, S extends number ? S : never, F extends ResponseFormat ? F : never>
  : never

export interface ClientResponse<
  T,
  U extends number = StatusCode,
  F extends ResponseFormat = ResponseFormat
> extends globalThis.Response {
  readonly body: ReadableStream | null
  readonly bodyUsed: boolean
  ok: U extends SuccessStatusCode
    ? true
    : U extends Exclude<StatusCode, SuccessStatusCode>
    ? false
    : boolean
  status: U
  statusText: string
  headers: Headers
  url: string
  redirect(url: string, status: number): Response
  clone(): Response
  json(): F extends 'text' ? Promise<never> : F extends 'json' ? Promise<T> : Promise<unknown>
  text(): F extends 'text' ? (T extends string ? Promise<T> : Promise<never>) : Promise<string>
  blob(): Promise<Blob>
  formData(): Promise<FormData>
  arrayBuffer(): Promise<ArrayBuffer>
}

type HonoURL<Prefix extends string, Path extends string, Arg> = IsLiteral<Prefix> extends true
  ? TrimEndSlash<Prefix> extends `${infer Protocol}://${infer Rest}`
    ? Rest extends `${infer Hostname}/${infer P}`
      ? ParseHostName<Hostname> extends [infer Host extends string, infer Port extends string]
        ? Arg extends { param: infer Param }
          ? Arg extends { query: infer Query }
            ? IsEmptyObject<Query> extends true
              ? TypedURL<`${Protocol}:`, Host, Port, `${ApplyParam<TrimStartSlash<P>, Param>}`, ''>
              : TypedURL<
                  `${Protocol}:`,
                  Host,
                  Port,
                  `${ApplyParam<TrimStartSlash<P>, Param>}`,
                  `?${string}`
                >
            : TypedURL<`${Protocol}:`, Host, Port, `${ApplyParam<TrimStartSlash<P>, Param>}`, ''>
          : Arg extends { query: infer Query }
          ? IsEmptyObject<Query> extends true
            ? TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<P>}`, ''>
            : TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<P>}`, `?${string}`>
          : TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<P>}`, ''>
        : never
      : ParseHostName<Rest> extends [infer Host extends string, infer Port extends string]
      ? Arg extends { param: infer Param }
        ? Arg extends { query: infer Query }
          ? IsEmptyObject<Query> extends true
            ? TypedURL<`${Protocol}:`, Host, Port, `${ApplyParam<TrimStartSlash<Path>, Param>}`, ''>
            : TypedURL<
                `${Protocol}:`,
                Host,
                Port,
                `${ApplyParam<TrimStartSlash<Path>, Param>}`,
                `?${string}`
              >
          : TypedURL<`${Protocol}:`, Host, Port, `${ApplyParam<TrimStartSlash<Path>, Param>}`, ''>
        : Arg extends { query: infer Query }
        ? IsEmptyObject<Query> extends true
          ? TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<Path>}`, ''>
          : TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<Path>}`, `?${string}`>
        : TypedURL<`${Protocol}:`, Host, Port, `/${TrimStartSlash<Path>}`, ''>
      : never
    : URL
  : URL
type ParseHostName<T extends string> = T extends `${infer Host}:${infer Port}`
  ? [Host, Port]
  : [T, '']
type TrimStartSlash<T extends string> = T extends `/${infer R}` ? TrimStartSlash<R> : T
type TrimEndSlash<T extends string> = T extends `${infer R}/` ? TrimEndSlash<R> : T
type IsLiteral<T extends string> = [T] extends [never] ? false : string extends T ? false : true
type ApplyParam<
  Path extends string,
  P,
  Result extends string = ''
> = Path extends `${infer Head}/${infer Rest}`
  ? Head extends `:${infer Param}`
    ? P extends Record<Param, infer Value extends string>
      ? IsLiteral<Value> extends true
        ? ApplyParam<Rest, P, `${Result}/${Value & string}`>
        : ApplyParam<Rest, P, `${Result}/${Head}`>
      : ApplyParam<Rest, P, `${Result}/${Head}`>
    : ApplyParam<Rest, P, `${Result}/${Head}`>
  : Path extends `:${infer Param}`
  ? P extends Record<Param, infer Value extends string>
    ? IsLiteral<Value> extends true
      ? `${Result}/${Value & string}`
      : `${Result}/${Path}`
    : `${Result}/${Path}`
  : `${Result}/${Path}`
type IsEmptyObject<T> = keyof T extends never ? true : false

export interface TypedURL<
  Protocol extends string,
  Hostname extends string,
  Port extends string,
  Pathname extends string,
  Search extends string
> extends URL {
  protocol: Protocol
  hostname: Hostname
  port: Port
  host: Port extends '' ? Hostname : `${Hostname}:${Port}`
  origin: `${Protocol}//${Hostname}${Port extends '' ? '' : `:${Port}`}`
  pathname: Pathname
  search: Search
  href: `${Protocol}//${Hostname}${Port extends '' ? '' : `:${Port}`}${Pathname}${Search}`
}

export interface Response extends ClientResponse<unknown> {}

export type Fetch<T> = (
  args?: InferRequestType<T>,
  opt?: ClientRequestOptions
) => Promise<ClientResponseOfEndpoint<InferEndpointType<T>>>

type InferEndpointType<T> = T extends (
  args: infer R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any | undefined
) => Promise<infer U>
  ? U extends ClientResponse<infer O, infer S, infer F>
    ? { input: NonNullable<R>; output: O; outputFormat: F; status: S } extends Endpoint
      ? { input: NonNullable<R>; output: O; outputFormat: F; status: S }
      : never
    : never
  : never

export type InferResponseType<T, U extends StatusCode = StatusCode> = InferResponseTypeFromEndpoint<
  InferEndpointType<T>,
  U
>

type InferResponseTypeFromEndpoint<T extends Endpoint, U extends StatusCode> = T extends {
  output: infer O
  status: infer S
}
  ? S extends U
    ? O
    : never
  : never

export type InferRequestType<T> = T extends (
  args: infer R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any | undefined
) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
  : never

export type InferRequestOptionsType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
  options: infer R
) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
  : never

/**
 * Filter a ClientResponse type so it only includes responses of specific status codes.
 */
export type FilterClientResponseByStatusCode<
  T extends ClientResponse<any, any, any>,
  U extends number = StatusCode
> = T extends ClientResponse<infer RT, infer RC, infer RF>
  ? RC extends U
    ? ClientResponse<RT, RC, RF>
    : never
  : never

type PathToChain<
  Prefix extends string,
  Path extends string,
  E extends Schema,
  Original extends string = Path
> = Path extends `/${infer P}`
  ? PathToChain<Prefix, P, E, Path>
  : Path extends `${infer P}/${infer R}`
  ? { [K in P]: PathToChain<Prefix, R, E, Original> }
  : {
      [K in Path extends '' ? 'index' : Path]: ClientRequest<
        Prefix,
        Original,
        E extends Record<string, unknown> ? E[Original] : never
      >
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Client<T, Prefix extends string> = T extends HonoBase<any, infer S, any>
  ? S extends Record<infer K, Schema>
    ? K extends string
      ? PathToChain<Prefix, K, S>
      : never
    : never
  : never

export type Callback = (opts: CallbackOptions) => unknown

interface CallbackOptions {
  path: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[]
}

export type ObjectType<T = unknown> = {
  [key: string]: T
}
