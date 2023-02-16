import type { Hono } from '../hono.ts'
import type { ValidationTargets, Env } from '../types.ts'

type MethodName = `$${string}`

type Endpoint = Record<MethodName, Data>

type Data = {
  input: Partial<ValidationTargets> & {
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

export type Fetch<T> = (
  args?: InferRequestType<T>,
  opt?: RequestOption
) => Promise<ClientResponse<InferResponseType<T>>>

export type InferResponseType<T> = T extends () => Promise<ClientResponse<infer O>> ? O : never
export type InferRequestType<T> = T extends (args: infer R) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
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
