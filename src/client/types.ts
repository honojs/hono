import type { Hono } from '../hono'
import type { ValidationTypes, Env } from '../types'

type MethodName = `$${string}`

type Endpoint = Record<MethodName, Data>

type Data = {
  input: Partial<ValidationTypes> & {
    param?: Record<string, string>
  }
  output: {}
}

export type RequestOption = {
  headers?: Record<string, string>
}

type ClientRequest<S extends Data> = {
  [M in keyof S]: S[M] extends { input: infer R; output: infer O }
    ? (args?: R, options?: RequestOption) => Promise<ClientResponse<O>>
    : never
}

export interface ClientResponse<T> extends Response {
  json(): Promise<T>
}

export type InferResponseType<T> = T extends Record<MethodName, infer R>
  ? R extends () => Promise<ClientResponse<infer O>>
    ? O
    : never
  : never

type PathToChain<
  Path extends string,
  E extends Endpoint,
  Original extends string = ''
> = Path extends `/${infer P}`
  ? PathToChain<P, E, Path>
  : Path extends `${infer P}/${infer R}`
  ? { [K in P]: PathToChain<R, E, Original> }
  : {
      [K in Path extends '' ? 'index' : Path]: ClientRequest<
        E extends Record<string, unknown> ? E[Original] : never
      >
    }

export type Client<T> = T extends Hono<Env, infer S>
  ? S extends Record<infer K, Endpoint>
    ? K extends string
      ? PathToChain<K, S>
      : never
    : never
  : never

export type Callback = (opts: CallbackOptions) => unknown

interface CallbackOptions {
  path: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[]
}
