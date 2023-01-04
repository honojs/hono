import { HonoRequest } from './request'
import type { TypeResponse, Route } from './types'
import type { Environment, NotFoundHandler } from './types'
import type { CookieOptions } from './utils/cookie'
import { serialize } from './utils/cookie'
import type { StatusCode } from './utils/http-status'

type Runtime = 'node' | 'deno' | 'bun' | 'cloudflare' | 'fastly' | 'vercel' | 'lagon' | 'other'
type HeaderRecord = Record<string, string | string[]>
type Data = string | ArrayBuffer | ReadableStream

export interface ExecutionContext {
  waitUntil(promise: Promise<void>): void
  passThroughOnException(): void
}
export interface ContextVariableMap {}

type GetVariable<K, E extends Partial<Environment>> = K extends keyof E['Variables']
  ? E['Variables'][K]
  : K extends keyof ContextVariableMap
  ? ContextVariableMap[K]
  : unknown

type ContextOptions<E extends Partial<Environment>, R extends Route> = {
  env?: E['Bindings']
  executionCtx?: FetchEvent | ExecutionContext | undefined
  notFoundHandler?: NotFoundHandler<E, R>
  paramData?: Record<string, string>
  queryIndex?: number
}

export class Context<
  E extends Partial<Environment> = Environment,
  R extends Route = Route,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  I = any
> {
  env: E['Bindings'] = {}
  finalized: boolean = false
  error: Error | undefined = undefined

  private _req?: HonoRequest<R, I>
  private _status: StatusCode = 200
  private _executionCtx: FetchEvent | ExecutionContext | undefined
  private _pretty: boolean = false
  private _prettySpace: number = 2
  private _map: Record<string, unknown> | undefined
  private _headers: Headers | undefined = undefined
  private _preparedHeaders: Record<string, string> | undefined = undefined
  private _res: Response | undefined
  private _paramData: Record<string, string> | undefined
  private _queryIndex: number | undefined
  private rawRequest: Request
  private notFoundHandler: NotFoundHandler<E, R> = () => new Response()

  constructor(req: Request, options?: ContextOptions<E, R>) {
    this.rawRequest = req
    if (options) {
      this._executionCtx = options.executionCtx
      this._paramData = options.paramData
      this.env = options.env
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler
      }
      this._queryIndex = options.queryIndex
    }
  }

  get req(): HonoRequest<R, I> {
    if (this._req) {
      return this._req
    } else {
      this._req = new HonoRequest<R, I>(this.rawRequest, this._paramData, this._queryIndex)
      return this._req
    }
  }

  get event(): FetchEvent {
    if (this._executionCtx instanceof FetchEvent) {
      return this._executionCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  get executionCtx(): ExecutionContext {
    if (this._executionCtx) {
      return this._executionCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  get res(): Response {
    return (this._res ||= new Response('404 Not Found', { status: 404 }))
  }

  set res(_res: Response) {
    this._res = _res
    this.finalized = true
  }

  header(name: string, value: string, options?: { append?: boolean }): void {
    if (options?.append) {
      if (!this._headers) {
        this._headers = new Headers(this._preparedHeaders)
      }
      this._headers.append(name, value)
    } else {
      if (this._headers) {
        this._headers.set(name, value)
      } else {
        this._preparedHeaders ??= {}
        this._preparedHeaders[name.toLowerCase()] = value
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

  status(status: StatusCode): void {
    this._status = status
  }

  set<Key extends keyof E['Variables'] | keyof ContextVariableMap>(
    key: Key,
    value: GetVariable<Key, E>
  ): void {
    this._map ||= {}
    this._map[key as string] = value
  }

  get<Key extends keyof E['Variables'] | keyof ContextVariableMap>(key: Key): GetVariable<Key, E> {
    return this._map?.[key as string] as GetVariable<Key, E>
  }

  pretty(prettyJSON: boolean, space: number = 2): void {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse(data: Data | null, status: StatusCode, headers?: HeaderRecord): Response {
    if (!headers && !this._headers && !this._res) {
      return new Response(data, {
        status,
        headers: this._preparedHeaders,
      })
    }

    this._preparedHeaders ??= {}

    if (!this._headers) {
      this._headers ??= new Headers()
      for (const [k, v] of Object.entries(this._preparedHeaders)) {
        this._headers.set(k, v)
      }
    }

    if (this._res) {
      this._res.headers.forEach((v, k) => {
        this._headers?.set(k, v)
      })
      for (const [k, v] of Object.entries(this._preparedHeaders)) {
        this._headers.set(k, v)
      }
    }

    headers ??= {}
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        this._headers.set(k, v)
      } else {
        this._headers.delete(k)
        for (const v2 of v) {
          this._headers.append(k, v2)
        }
      }
    }

    return new Response(data, {
      status,
      headers: this._headers,
    })
  }

  body(data: Data | null, status: StatusCode = this._status, headers?: HeaderRecord): Response {
    return this.newResponse(data, status, headers)
  }

  text(text: string, status?: StatusCode, headers?: HeaderRecord): Response {
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!headers && !status && !this._res && !this._headers && !this._preparedHeaders) {
      return new Response(text)
    }
    this._preparedHeaders ??= {}
    this._preparedHeaders['content-type'] = 'text/plain; charset=UTF8'
    return this.newResponse(text, status ?? this._status, headers)
  }

  json<T>(object: T, status: StatusCode = this._status, headers?: HeaderRecord): Response {
    const body = this._pretty
      ? JSON.stringify(object, null, this._prettySpace)
      : JSON.stringify(object)
    this._preparedHeaders ??= {}
    this._preparedHeaders['content-type'] = 'application/json; charset=UTF-8'
    return this.newResponse(body, status, headers)
  }

  jsonT<T>(object: T, status: StatusCode = this._status, headers?: HeaderRecord): TypeResponse<T> {
    return {
      response: this.json(object, status, headers),
      data: object,
      format: 'json',
    }
  }

  html(html: string, status: StatusCode = this._status, headers?: HeaderRecord): Response {
    this._preparedHeaders ??= {}
    this._preparedHeaders['content-type'] = 'text/html; charset=UTF-8'
    return this.newResponse(html, status, headers)
  }

  redirect(location: string, status: StatusCode = 302): Response {
    this._headers ??= new Headers()
    this._headers.set('Location', location)
    return this.newResponse(null, status)
  }

  cookie(name: string, value: string, opt?: CookieOptions): void {
    const cookie = serialize(name, value, opt)
    this.header('set-cookie', cookie, { append: true })
  }

  notFound(): Response | Promise<Response> {
    return this.notFoundHandler(this)
  }

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
      return 'cloudflare'
    }

    if (global?.fastly !== undefined) {
      return 'fastly'
    }

    if (typeof global?.EdgeRuntime === 'string') {
      return 'vercel'
    }

    if (global?.process?.release?.name === 'node') {
      return 'node'
    }

    if (global?.__lagon__ !== undefined) {
      return 'lagon'
    }

    return 'other'
  }
}
