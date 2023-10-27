import type { Runtime } from './helper/adapter/index.ts'
import type { HonoRequest } from './request.ts'
import type { Env, FetchEventLike, NotFoundHandler, Input, TypedResponse } from './types.ts'
import type { CookieOptions } from './utils/cookie.ts'
import { serialize } from './utils/cookie.ts'
import type { StatusCode } from './utils/http-status.ts'
import { StreamingApi } from './utils/stream.ts'
import type { JSONValue, InterfaceToType } from './utils/types.ts'

type HeaderRecord = Record<string, string | string[]>
type Data = string | ArrayBuffer | ReadableStream

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

export interface ContextVariableMap {}

export interface ContextRenderer {}
interface DefaultRenderer {
  (content: string): Response | Promise<Response>
}
export type Renderer = ContextRenderer extends Function ? ContextRenderer : DefaultRenderer

interface Get<E extends Env> {
  <Key extends keyof ContextVariableMap>(key: Key): ContextVariableMap[Key]
  <Key extends keyof E['Variables']>(key: Key): E['Variables'][Key]
}

interface Set<E extends Env> {
  <Key extends keyof ContextVariableMap>(key: Key, value: ContextVariableMap[Key]): void
  <Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void
}

interface NewResponse {
  (data: Data | null, status?: StatusCode, headers?: HeaderRecord): Response
  (data: Data | null, init?: ResponseInit): Response
}

interface BodyRespond extends NewResponse {}

interface TextRespond {
  (text: string, status?: StatusCode, headers?: HeaderRecord): Response
  (text: string, init?: ResponseInit): Response
}

interface JSONRespond {
  <T = JSONValue>(object: T, status?: StatusCode, headers?: HeaderRecord): Response
  <T = JSONValue>(object: T, init?: ResponseInit): Response
}

interface JSONTRespond {
  <T>(
    object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
    status?: StatusCode,
    headers?: HeaderRecord
  ): TypedResponse<
    InterfaceToType<T> extends JSONValue
      ? JSONValue extends InterfaceToType<T>
        ? never
        : T
      : never
  >
  <T>(
    object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
    init?: ResponseInit
  ): TypedResponse<
    InterfaceToType<T> extends JSONValue
      ? JSONValue extends InterfaceToType<T>
        ? never
        : T
      : never
  >
}

interface HTMLRespond {
  (html: string, status?: StatusCode, headers?: HeaderRecord): Response
  (html: string, init?: ResponseInit): Response
}

type ContextOptions<E extends Env> = {
  env: E['Bindings']
  executionCtx?: FetchEventLike | ExecutionContext | undefined
  notFoundHandler?: NotFoundHandler<E>
}

const TEXT_PLAIN = 'text/plain; charset=UTF-8'

export class Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
> {
  req: HonoRequest<P, I['out']>
  env: E['Bindings'] = {}
  private _var: E['Variables'] = {}
  finalized: boolean = false
  error: Error | undefined = undefined

  private _status: StatusCode = 200
  private _exCtx: FetchEventLike | ExecutionContext | undefined // _executionCtx
  private _h: Headers | undefined = undefined //  _headers
  private _pH: Record<string, string> | undefined = undefined // _preparedHeaders
  private _res: Response | undefined
  private _init = true
  private _renderer: Renderer = (content: string) => this.html(content)
  private notFoundHandler: NotFoundHandler<E> = () => new Response()

  constructor(req: HonoRequest<P, I['out']>, options?: ContextOptions<E>) {
    this.req = req
    if (options) {
      this._exCtx = options.executionCtx
      this.env = options.env
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler
      }
    }
  }

  get event(): FetchEventLike {
    if (this._exCtx && 'respondWith' in this._exCtx) {
      return this._exCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  get executionCtx(): ExecutionContext {
    if (this._exCtx) {
      return this._exCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  get res(): Response {
    this._init = false
    return (this._res ||= new Response('404 Not Found', { status: 404 }))
  }

  set res(_res: Response | undefined) {
    this._init = false
    if (this._res && _res) {
      this._res.headers.delete('content-type')
      this._res.headers.forEach((v, k) => {
        _res.headers.set(k, v)
      })
    }
    this._res = _res
    this.finalized = true
  }

  /**
   * @experimental
   * `c.render()` is an experimental feature.
   * The API might be changed.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: Renderer = (...args: any[]) => this._renderer(...args)

  /**
   * @experimental
   * `c.setRenderer()` is an experimental feature.
   * The API might be changed.
   */
  setRenderer = (renderer: Renderer) => {
    this._renderer = renderer
  }

  header = (name: string, value: string | undefined, options?: { append?: boolean }): void => {
    // Clear the header
    if (value === undefined) {
      if (this._h) {
        this._h.delete(name)
      } else if (this._pH) {
        delete this._pH[name.toLocaleLowerCase()]
      }
      if (this.finalized) {
        this.res.headers.delete(name)
      }
      return
    }

    if (options?.append) {
      if (!this._h) {
        this._init = false
        this._h = new Headers(this._pH)
        this._pH = {}
      }
      this._h.append(name, value)
    } else {
      if (this._h) {
        this._h.set(name, value)
      } else {
        this._pH ??= {}
        this._pH[name.toLowerCase()] = value
      }
    }

    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value)
      } else {
        this.res.headers.set(name, value)
      }
    }
  }

  status = (status: StatusCode): void => {
    this._status = status
  }

  set: Set<E> = (key: string, value: unknown) => {
    this._var ??= {}
    this._var[key as string] = value
  }

  get: Get<E> = (key: string) => {
    return this._var ? this._var[key] : undefined
  }

  // c.var.propName is a read-only
  get var(): Readonly<E['Variables']> {
    return { ...this._var }
  }

  newResponse: NewResponse = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    // Optimized
    if (this._init && !headers && !arg && this._status === 200) {
      return new Response(data, {
        headers: this._pH,
      })
    }

    // Return Response immediately if arg is ResponseInit.
    if (arg && typeof arg !== 'number') {
      const res = new Response(data, arg)
      const contentType = this._pH?.['content-type']
      if (contentType) {
        res.headers.set('content-type', contentType)
      }
      return res
    }

    const status = arg ?? this._status
    this._pH ??= {}

    this._h ??= new Headers()
    for (const [k, v] of Object.entries(this._pH)) {
      this._h.set(k, v)
    }

    if (this._res) {
      this._res.headers.forEach((v, k) => {
        this._h?.set(k, v)
      })
      for (const [k, v] of Object.entries(this._pH)) {
        this._h.set(k, v)
      }
    }

    headers ??= {}
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        this._h.set(k, v)
      } else {
        this._h.delete(k)
        for (const v2 of v) {
          this._h.append(k, v2)
        }
      }
    }

    return new Response(data, {
      status,
      headers: this._h,
    })
  }

  body: BodyRespond = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    return typeof arg === 'number'
      ? this.newResponse(data, arg, headers)
      : this.newResponse(data, arg)
  }

  text: TextRespond = (
    text: string,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!this._pH) {
      if (this._init && !headers && !arg) {
        return new Response(text)
      }
      this._pH = {}
    }
    // If Content-Type is not set, we don't have to set `text/plain`.
    // Fewer the header values, it will be faster.
    if (this._pH['content-type']) {
      this._pH['content-type'] = TEXT_PLAIN
    }
    return typeof arg === 'number'
      ? this.newResponse(text, arg, headers)
      : this.newResponse(text, arg)
  }

  json: JSONRespond = <T = {}>(
    object: T,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ) => {
    const body = JSON.stringify(object)
    this._pH ??= {}
    this._pH['content-type'] = 'application/json; charset=UTF-8'
    return typeof arg === 'number'
      ? this.newResponse(body, arg, headers)
      : this.newResponse(body, arg)
  }

  jsonT: JSONTRespond = <T>(
    object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): TypedResponse<
    InterfaceToType<T> extends JSONValue
      ? JSONValue extends InterfaceToType<T>
        ? never
        : T
      : never
  > => {
    const response =
      typeof arg === 'number' ? this.json(object, arg, headers) : this.json(object, arg)

    return {
      response,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: object as any,
      format: 'json',
      status: response.status,
    }
  }

  html: HTMLRespond = (
    html: string,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    this._pH ??= {}
    this._pH['content-type'] = 'text/html; charset=UTF-8'
    return typeof arg === 'number'
      ? this.newResponse(html, arg, headers)
      : this.newResponse(html, arg)
  }

  redirect = (location: string, status: StatusCode = 302): Response => {
    this._h ??= new Headers()
    this._h.set('Location', location)
    return this.newResponse(null, status)
  }

  streamText = (
    cb: (stream: StreamingApi) => Promise<void>,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    headers ??= {}
    this.header('content-type', TEXT_PLAIN)
    this.header('x-content-type-options', 'nosniff')
    this.header('transfer-encoding', 'chunked')
    return this.stream(cb, arg, headers)
  }

  stream = (
    cb: (stream: StreamingApi) => Promise<void>,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    const { readable, writable } = new TransformStream()
    const stream = new StreamingApi(writable)
    cb(stream).finally(() => stream.close())

    return typeof arg === 'number'
      ? this.newResponse(readable, arg, headers)
      : this.newResponse(readable, arg)
  }

  /** @deprecated
   * Use Cookie Middleware instead of `c.cookie()`. The `c.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { setCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => {
   *   setCookie(c, 'key', 'value')
   *   //...
   * })
   */
  cookie = (name: string, value: string, opt?: CookieOptions): void => {
    const cookie = serialize(name, value, opt)
    this.header('set-cookie', cookie, { append: true })
  }

  notFound = (): Response | Promise<Response> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.notFoundHandler(this)
  }

  /** @deprecated
   * Use `getRuntimeKey()` exported from `hono/adapter` instead of `c.runtime()`. The `c.runtime()` will be removed in v4.
   *
   * @example
   *
   * import { getRuntimeKey } from 'hono/adapter'
   * // ...
   * app.get('/', (c) => {
   *   const key = getRuntimeKey()
   *   //...
   * })
   */
  get runtime(): Runtime {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const global = globalThis as any

    if (global?.Deno !== undefined) {
      return 'deno'
    }

    if (global?.Bun !== undefined) {
      return 'bun'
    }

    if (typeof global?.WebSocketPair === 'function') {
      return 'workerd'
    }

    if (typeof global?.EdgeRuntime === 'string') {
      return 'edge-light'
    }

    if (global?.fastly !== undefined) {
      return 'fastly'
    }

    if (global?.__lagon__ !== undefined) {
      return 'lagon'
    }

    if (global?.process?.release?.name === 'node') {
      return 'node'
    }

    return 'other'
  }
}
