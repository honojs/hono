import type { Hono } from '../hono'
import type { HonoBase } from '../hono-base'
import type { METHODS, METHOD_NAME_ALL_LOWERCASE } from '../router'
import type {
  Endpoint,
  ExtractSchema,
  InputToDataByTarget,
  KnownResponseFormat,
  ResponseFormat,
  Schema,
} from '../types'
import type { StatusCode, SuccessStatusCode } from '../utils/http-status'
import type { HasRequiredKeys, UnionToIntersection } from '../utils/types'

/**
 * Type representing the '$all' method name
 */
type MethodNameAll = `$${typeof METHOD_NAME_ALL_LOWERCASE}`

/**
 * Type representing all standard HTTP methods prefixed with '$'
 * e.g., '$get' | '$post' | '$put' | '$delete' | '$options' | '$patch' | '$query'
 */
type StandardMethods = `$${(typeof METHODS)[number]}`

/**
 * Expands '$all' into all standard HTTP methods.
 * If the schema contains '$all', it creates a type where all standard HTTP methods
 * point to the same endpoint definition as '$all', while removing '$all' itself.
 */
type ExpandAllMethod<S> = MethodNameAll extends keyof S
  ? { [M in StandardMethods]: S[MethodNameAll] } & Omit<S, MethodNameAll>
  : S

type HonoRequest = (typeof Hono.prototype)['request']

export type BuildSearchParamsFn = (query: Record<string, string | string[]>) => URLSearchParams

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
  /**
   * Custom function to serialize query parameters into URLSearchParams.
   * By default, arrays are serialized as multiple parameters with the same key (e.g., `key=a&key=b`).
   * You can provide a custom function to change this behavior, for example to use bracket notation (e.g., `key[]=a&key[]=b`).
   *
   * @example
   * ```ts
   * const client = hc('http://localhost', {
   *   buildSearchParams: (query) => {
   *     return new URLSearchParams(qs.stringify(query))
   *   }
   * })
   * ```
   */
  buildSearchParams?: BuildSearchParamsFn
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
  [M in keyof ExpandAllMethod<S>]: ExpandAllMethod<S>[M] extends Endpoint & { input: infer R }
    ? R extends object
      ? HasRequiredKeys<R> extends true
        ? (
            args: R,
            options?: ClientRequestOptions
          ) => Promise<ClientResponseOfEndpoint<ExpandAllMethod<S>[M]>>
        : (
            args?: R,
            options?: ClientRequestOptions
          ) => Promise<ClientResponseOfEndpoint<ExpandAllMethod<S>[M]>>
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
      | undefined = undefined,
  >(
    arg?: Arg
  ) => HonoURL<Prefix, Path, Arg>
  $path: <
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
      | undefined = undefined,
  >(
    arg?: Arg
  ) => BuildPath<Path, Arg>
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
  F extends ResponseFormat = ResponseFormat,
> {
  readonly body: ReadableStream | null
  readonly bodyUsed: boolean
  ok: U extends SuccessStatusCode
    ? true
    : U extends Exclude<StatusCode, SuccessStatusCode>
      ? false
      : boolean
  redirected: boolean
  status: U
  statusText: string
  type: 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect'
  headers: Headers
  url: string
  redirect(url: string, status: number): Response
  clone(): Response
  bytes(): Promise<Uint8Array<ArrayBuffer>>
  json(): F extends 'text' ? Promise<never> : F extends 'json' ? Promise<T> : Promise<unknown>
  text(): F extends 'text' ? (T extends string ? Promise<T> : Promise<never>) : Promise<string>
  blob(): Promise<Blob>
  formData(): Promise<FormData>
  arrayBuffer(): Promise<ArrayBuffer>
}

type BuildSearch<Arg, Key extends 'query'> = Arg extends { [K in Key]: infer Query }
  ? IsEmptyObject<Query> extends true
    ? ''
    : `?${string}`
  : ''

type BuildPathname<P extends string, Arg> = Arg extends { param: infer Param }
  ? `${ApplyParam<TrimStartSlash<P>, Param>}`
  : `/${TrimStartSlash<P>}`

type BuildPath<P extends string, Arg> = `${BuildPathname<P, Arg>}${BuildSearch<Arg, 'query'>}`

type BuildTypedURL<
  Protocol extends string,
  Host extends string,
  Port extends string,
  P extends string,
  Arg,
> = TypedURL<`${Protocol}:`, Host, Port, BuildPathname<P, Arg>, BuildSearch<Arg, 'query'>>

type HonoURL<Prefix extends string, Path extends string, Arg> =
  IsLiteral<Prefix> extends true
    ? TrimEndSlash<Prefix> extends `${infer Protocol}://${infer Rest}`
      ? Rest extends `${infer Hostname}/${infer P}`
        ? ParseHostName<Hostname> extends [infer Host extends string, infer Port extends string]
          ? BuildTypedURL<Protocol, Host, Port, P, Arg>
          : never
        : ParseHostName<Rest> extends [infer Host extends string, infer Port extends string]
          ? BuildTypedURL<Protocol, Host, Port, Path, Arg>
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
  Result extends string = '',
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
  Search extends string,
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
  U extends number = StatusCode,
> =
  T extends ClientResponse<infer RT, infer RC, infer RF>
    ? RC extends U
      ? ClientResponse<RT, RC, RF>
      : never
    : never

type PathToChain<
  Prefix extends string,
  Path extends string,
  E extends Schema,
  Original extends string = Path,
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

export type Client<T, Prefix extends string> =
  T extends HonoBase<any, infer S, any>
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

type GlobalResponseDefinition = {
  [S in StatusCode]?: {
    [F in KnownResponseFormat]?: unknown
  }
}

type ToEndpoints<Def extends GlobalResponseDefinition, R> = {
  [S in keyof Def & StatusCode]: {
    [F in keyof Def[S] & KnownResponseFormat]: Omit<R, 'output' | 'status' | 'outputFormat'> & {
      output: Def[S][F]
      status: S
      outputFormat: F
    }
  }[keyof Def[S] & KnownResponseFormat]
}[keyof Def & StatusCode]

type ModRoute<R, Def extends GlobalResponseDefinition> = R extends Endpoint
  ? R | ToEndpoints<Def, R>
  : R

type ModSchema<D, Def extends GlobalResponseDefinition> = {
  [K in keyof D]: {
    [M in keyof D[K]]: ModRoute<D[K][M], Def>
  }
}

export type ApplyGlobalResponse<App, Def extends GlobalResponseDefinition> =
  App extends HonoBase<infer E, infer _ extends Schema, infer B>
    ? ModSchema<ExtractSchema<App>, Def> extends infer S extends Schema
      ? Hono<E, S, B>
      : never
    : never

type PickRoute<R, U extends StatusCode> = R extends Endpoint
  ? R extends { status: U }
    ? R
    : never
  : R

type PickSchema<D, U extends StatusCode> = {
  [K in keyof D]: {
    [M in keyof D[K]]: PickRoute<D[K][M], U>
  }
}

/**
 * Keep only specific status code responses from all routes of an app.
 * Useful when error responses are handled centrally (e.g., via custom fetch)
 * and you want the client to only expose success response types.
 *
 * @example
 * ```ts
 * type AppSuccessOnly = PickResponseByStatusCode<typeof app, 200>
 * const client = hc<AppSuccessOnly>('http://localhost')
 * ```
 */
export type PickResponseByStatusCode<App, U extends StatusCode> =
  App extends HonoBase<infer E, infer _ extends Schema, infer B>
    ? PickSchema<ExtractSchema<App>, U> extends infer S extends Schema
      ? Hono<E, S, B>
      : never
    : never

// hcx

/** `ClientX` remaps the tree {@link Client} builds for `hc`, one mapped type per node. */
type EmptyRecord = Record<never, never>

/** `:id{[0-9]+}?` -> `id` */
type ParamNameOf<K> = K extends `:${infer N}`
  ? N extends `${infer B}{${string}`
    ? B
    : N extends `${infer B}?`
      ? B
      : N
  : never

type ParamSegmentKeys<N> = Extract<keyof N, `:${string}`>
type OptionalSegmentKeys<N> = Extract<keyof N, `:${string}?`>
type StaticSegmentKeys<N> = Exclude<keyof N, `:${string}` | `$${string}`>
type MethodKeys<N> = Extract<keyof N, `$${string}`>
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never

/** `hc`'s `args` minus `param` (bound by the chain) and the body (positional). */
type RequestOptionsOf<A> = ClientRequestOptions & {
  [K in keyof A as K extends 'query' | 'header' | 'cookie' ? K : never]: A[K]
}
type OptionsParam<A> =
  HasRequiredKeys<RequestOptionsOf<A>> extends true
    ? [options: RequestOptionsOf<A>]
    : [options?: RequestOptionsOf<A>]
type ReadCall<A, Out> = (...args: OptionsParam<A>) => Out
/** A body-less write keeps its body slot so `$post(x, opts)` is never read as `$post(opts)`. */
type WriteCall<A, Body, Out> = [Body] extends [never]
  ? (body?: undefined, ...args: OptionsParam<A>) => Out
  : (body: Body, ...args: OptionsParam<A>) => Out

type JsonBodyOf<A extends {}> = InputToDataByTarget<A, 'json'>
type FormBodyOf<A extends {}> = InputToDataByTarget<A, 'form'>
/** Every query a node accepts, for its `$url` / `$path` argument. */
type QueryOfNode<N> = InputToDataByTarget<
  { [K in MethodKeys<N>]: InferRequestType<N[K]> }[MethodKeys<N>],
  'query'
>

/** `$get` reads, everything else writes and carries `.form` when the route declares one. */
type MethodCall<M, F> = F extends (args: infer A, options?: never) => Promise<infer R>
  ? M extends '$get'
    ? ReadCall<NonNullable<A>, Promise<R>>
    : WriteCall<NonNullable<A>, JsonBodyOf<NonNullable<A>>, Promise<R>> &
        ([FormBodyOf<NonNullable<A>>] extends [never]
          ? unknown
          : { form: WriteCall<NonNullable<A>, FormBodyOf<NonNullable<A>>, Promise<R>> })
  : never

/** The `{ param, query }` shape `BuildPathname` expects; `undefined & {}` would be `never`. */
type UrlArgOf<Bound, Arg> = { param: Bound } & (Arg extends undefined ? unknown : Arg)

/** `hc` only forwards `query` to a WebSocket, so that is all `$ws` accepts. */
type WsCall = (options?: { query?: Record<string, string | string[]> }) => WebSocket

/**
 * `$url` / `$path` / `$ws` exist where `hc` has them. The branch lives inside the mapped type on
 * purpose: outside it, the conditional is paid on every node instead of on read.
 */
type NodeMembers<N, Prefix extends string, Pre extends string, Bound> = {
  [K in MethodKeys<N>]: K extends '$url'
    ? <const Arg extends { query?: QueryOfNode<N> } | undefined = undefined>(
        arg?: Arg
      ) => HonoURL<Prefix, Pre, UrlArgOf<Bound, Arg>>
    : K extends '$path'
      ? <const Arg extends { query?: QueryOfNode<N> } | undefined = undefined>(
          arg?: Arg
        ) => BuildPath<Pre, UrlArgOf<Bound, Arg>>
      : K extends '$ws'
        ? WsCall
        : MethodCall<K, N[K]>
} & HoistedMembers<N, Prefix, Pre, Bound>

/**
 * `/a/:v?` also serves `/a`, so a node borrows the members (not the callable) of every node
 * reachable through `:x?` keys. `EmptyRecord` is the fold identity: a `[keys] extends [never]`
 * guard here costs on every node, measured.
 */
type HoistedMembers<N, Prefix extends string, Pre extends string, Bound> = UnionToIntersection<
  | EmptyRecord
  | { [K in OptionalSegmentKeys<N>]: NodeMembers<N[K], Prefix, Pre, Bound> }[OptionalSegmentKeys<N>]
>

/** Strings only (hono drops a falsy segment); `const V` lets `$path()` substitute a literal. */
type ParamCall<N, P extends keyof N & string, Prefix extends string, Pre extends string, Bound> = <
  const V extends string,
>(params: { [Q in ParamNameOf<P> & string]: V }) => ClientXNode<
  N[P],
  Prefix,
  `${Pre}/:${ParamNameOf<P> & string}`,
  Bound & { [Q in ParamNameOf<P> & string]: V }
>

/**
 * Sibling params (`/x/:id`, `/x/:xId`) become overloads. Fold only then: `UnionToIntersection` on
 * a one-member union compares the whole child structurally, measured at ~6k instantiations a node.
 */
type ParamCallable<
  N,
  Prefix extends string,
  Pre extends string,
  Bound,
  P extends keyof N & string = ParamSegmentKeys<N> & string,
> = [P] extends [never]
  ? unknown
  : IsUnion<P> extends true
    ? UnionToIntersection<{ [K in P]: ParamCall<N, K, Prefix, Pre, Bound> }[P]>
    : ParamCall<N, P, Prefix, Pre, Bound>

/**
 * `Pre` is the route path rebuilt while descending. `:id` stays a plain key so
 * `typeof api.users[':id'].$get` keeps naming a route; the runtime rejects that spelling.
 */
type ClientXNode<N, Prefix extends string, Pre extends string, Bound> = {
  [K in StaticSegmentKeys<N>]: ClientXNode<
    N[K],
    Prefix,
    // `hc`'s trailing-slash `index` is a leaf; a real segment named `index` has children.
    K extends 'index'
      ? [StaticSegmentKeys<N[K]> | ParamSegmentKeys<N[K]>] extends [never]
        ? Pre
        : `${Pre}/index`
      : `${Pre}/${K & string}`,
    Bound
  >
} & {
  [K in ParamSegmentKeys<N>]: ClientXNode<N[K], Prefix, `${Pre}/:${ParamNameOf<K> & string}`, Bound>
} & NodeMembers<N, Prefix, Pre, Bound> &
  ParamCallable<N, Prefix, Pre, Bound>

/** Client type for {@link hcx}. */
export type ClientX<T, Prefix extends string = string> =
  UnionToIntersection<Client<T, Prefix>> extends infer N
    ? // `hc` files `/` under `index`; `hcx` also puts it on the root node.
      ClientXNode<N, Prefix, '', EmptyRecord> &
        ([N] extends [{ index: infer R }] ? NodeMembers<R, Prefix, '', EmptyRecord> : unknown)
    : never
