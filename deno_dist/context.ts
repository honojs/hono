import type { HonoRequest } from './request.ts'
import type { Env, FetchEventLike, NotFoundHandler, Input, TypedResponse } from './types.ts'
import { resolveCallback, HtmlEscapedCallbackPhase } from './utils/html.ts'
import type { RedirectStatusCode, StatusCode } from './utils/http-status.ts'
import type { JSONValue, InterfaceToType, JSONParsed, IsAny } from './utils/types.ts'

type HeaderRecord = Record<string, string | string[]>
type Data = string | ArrayBuffer | ReadableStream

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

export interface ContextVariableMap {}

export interface ContextRenderer {}
interface DefaultRenderer {
  (content: string | Promise<string>): Response | Promise<Response>
}

export type Renderer = ContextRenderer extends Function ? ContextRenderer : DefaultRenderer
export type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Layout<T = Record<string, any>> = (props: T) => any

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
  <T>(
    object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
    status?: StatusCode,
    headers?: HeaderRecord
  ): Response &
    TypedResponse<
      InterfaceToType<T> extends JSONValue
        ? JSONValue extends InterfaceToType<T>
          ? never
          : JSONParsed<T>
        : never
    >
  <T>(object: InterfaceToType<T> extends JSONValue ? T : JSONValue, init?: ResponseInit): Response &
    TypedResponse<
      InterfaceToType<T> extends JSONValue
        ? JSONValue extends InterfaceToType<T>
          ? never
          : JSONParsed<T>
        : never
    >
}

interface HTMLRespond {
  (html: string | Promise<string>, status?: StatusCode, headers?: HeaderRecord):
    | Response
    | Promise<Response>
  (html: string | Promise<string>, init?: ResponseInit): Response | Promise<Response>
}

type ContextOptions<E extends Env> = {
  env: E['Bindings']
  executionCtx?: FetchEventLike | ExecutionContext | undefined
  notFoundHandler?: NotFoundHandler<E>
}

export const TEXT_PLAIN = 'text/plain; charset=UTF-8'

const setHeaders = (headers: Headers, map: Record<string, string> = {}) => {
  Object.entries(map).forEach(([key, value]) => headers.set(key, value))
  return headers
}

export class Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
> {
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  req: HonoRequest<P, I['out']>
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */
  env: E['Bindings'] = {}
  private _var: E['Variables'] = {}
  finalized: boolean = false
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   * @see https://hono.dev/api/context#error
   */
  error: Error | undefined = undefined

  #status: StatusCode = 200
  #executionCtx: FetchEventLike | ExecutionContext | undefined
  #headers: Headers | undefined = undefined
  #preparedHeaders: Record<string, string> | undefined = undefined
  #res: Response | undefined
  #isFresh = true
  private layout: Layout<PropsForRenderer & { Layout: Layout }> | undefined = undefined
  private renderer: Renderer = (content: string | Promise<string>) => this.html(content)
  private notFoundHandler: NotFoundHandler<E> = () => new Response()

  constructor(req: HonoRequest<P, I['out']>, options?: ContextOptions<E>) {
    this.req = req
    if (options) {
      this.#executionCtx = options.executionCtx
      this.env = options.env
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler
      }
    }
  }

  /**
   * @see https://hono.dev/api/context#event
   */
  get event(): FetchEventLike {
    if (this.#executionCtx && 'respondWith' in this.#executionCtx) {
      return this.#executionCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  /**
   * @see https://hono.dev/api/context#executionctx
   */
  get executionCtx(): ExecutionContext {
    if (this.#executionCtx) {
      return this.#executionCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  /**
   * @see https://hono.dev/api/context#res
   */
  get res(): Response {
    this.#isFresh = false
    return (this.#res ||= new Response('404 Not Found', { status: 404 }))
  }

  set res(_res: Response | undefined) {
    this.#isFresh = false
    if (this.#res && _res) {
      this.#res.headers.delete('content-type')
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === 'set-cookie') {
          const cookies = this.#res.headers.getSetCookie()
          _res.headers.delete('set-cookie')
          for (const cookie of cookies) {
            _res.headers.append('set-cookie', cookie)
          }
        } else {
          _res.headers.set(k, v)
        }
      }
    }
    this.#res = _res
    this.finalized = true
  }

  /**
   * `.render()` can create a response within a layout.
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   * @see https://hono.dev/api/context#render-setrenderer
   */
  render: Renderer = (...args) => this.renderer(...args)

  setLayout = (layout: Layout<PropsForRenderer & { Layout: Layout }>) => (this.layout = layout)
  getLayout = () => this.layout

  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   * @see https://hono.dev/api/context#render-setrenderer
   */
  setRenderer = (renderer: Renderer) => {
    this.renderer = renderer
  }

  /**
   * `.header()` can set headers.
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   * @see https://hono.dev/api/context#body
   */
  header = (name: string, value: string | undefined, options?: { append?: boolean }): void => {
    // Clear the header
    if (value === undefined) {
      if (this.#headers) {
        this.#headers.delete(name)
      } else if (this.#preparedHeaders) {
        delete this.#preparedHeaders[name.toLocaleLowerCase()]
      }
      if (this.finalized) {
        this.res.headers.delete(name)
      }
      return
    }

    if (options?.append) {
      if (!this.#headers) {
        this.#isFresh = false
        this.#headers = new Headers(this.#preparedHeaders)
        this.#preparedHeaders = {}
      }
      this.#headers.append(name, value)
    } else {
      if (this.#headers) {
        this.#headers.set(name, value)
      } else {
        this.#preparedHeaders ??= {}
        this.#preparedHeaders[name.toLowerCase()] = value
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
    this.#isFresh = false
    this.#status = status
  }

  /**
   * `.set()` can set the value specified by the key.
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is cool!!')
   *   await next()
   * })
   * ```
   * @see https://hono.dev/api/context#set-get
```
   */
  set: Set<E> = (key: string, value: unknown) => {
    this._var ??= {}
    this._var[key as string] = value
  }

  /**
   * `.get()` can use the value specified by the key.
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   * @see https://hono.dev/api/context#set-get
   */
  get: Get<E> = (key: string) => {
    return this._var ? this._var[key] : undefined
  }

  /**
   * `.var` can access the value of a variable.
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   * @see https://hono.dev/api/context#var
   */
  // c.var.propName is a read-only
  get var(): Readonly<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ContextVariableMap & (IsAny<E['Variables']> extends true ? Record<string, any> : E['Variables'])
  > {
    return { ...this._var } as never
  }

  newResponse: NewResponse = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    // Optimized
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders,
      })
    }

    if (arg && typeof arg !== 'number') {
      const headers = setHeaders(new Headers(arg.headers), this.#preparedHeaders)
      return new Response(data, {
        headers,
        status: arg.status ?? this.#status,
      })
    }

    const status = typeof arg === 'number' ? arg : this.#status
    this.#preparedHeaders ??= {}

    this.#headers ??= new Headers()
    setHeaders(this.#headers, this.#preparedHeaders)

    if (this.#res) {
      this.#res.headers.forEach((v, k) => {
        this.#headers?.set(k, v)
      })
      setHeaders(this.#headers, this.#preparedHeaders)
    }

    headers ??= {}
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        this.#headers.set(k, v)
      } else {
        this.#headers.delete(k)
        for (const v2 of v) {
          this.#headers.append(k, v2)
        }
      }
    }

    return new Response(data, {
      status,
      headers: this.#headers,
    })
  }

  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   * @see https://hono.dev/api/context#body
   */
  body: BodyRespond = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    return typeof arg === 'number'
      ? this.newResponse(data, arg, headers)
      : this.newResponse(data, arg)
  }

  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   * @see https://hono.dev/api/context#text
   */
  text: TextRespond = (
    text: string,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        return new Response(text)
      }
      this.#preparedHeaders = {}
    }
    this.#preparedHeaders['content-type'] = TEXT_PLAIN
    return typeof arg === 'number'
      ? this.newResponse(text, arg, headers)
      : this.newResponse(text, arg)
  }

  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   * @see https://hono.dev/api/context#json
   */
  json: JSONRespond = <T>(
    object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response &
    TypedResponse<
      InterfaceToType<T> extends JSONValue
        ? JSONValue extends InterfaceToType<T>
          ? never
          : JSONParsed<T>
        : never
    > => {
    const body = JSON.stringify(object)
    this.#preparedHeaders ??= {}
    this.#preparedHeaders['content-type'] = 'application/json; charset=UTF-8'
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return (
      typeof arg === 'number' ? this.newResponse(body, arg, headers) : this.newResponse(body, arg)
    ) as any
  }

  html: HTMLRespond = (
    html: string | Promise<string>,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response | Promise<Response> => {
    this.#preparedHeaders ??= {}
    this.#preparedHeaders['content-type'] = 'text/html; charset=UTF-8'

    if (typeof html === 'object') {
      if (!(html instanceof Promise)) {
        html = (html as string).toString() // HtmlEscapedString object to string
      }
      if ((html as string | Promise<string>) instanceof Promise) {
        return (html as unknown as Promise<string>)
          .then((html) => resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}))
          .then((html) => {
            return typeof arg === 'number'
              ? this.newResponse(html, arg, headers)
              : this.newResponse(html, arg)
          })
      }
    }

    return typeof arg === 'number'
      ? this.newResponse(html as string, arg, headers)
      : this.newResponse(html as string, arg)
  }

  /**
   * `.redirect()` can Redirect, default status code is 302.
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   * @see https://hono.dev/api/context#redirect
   */
  redirect = (location: string, status: RedirectStatusCode = 302): Response => {
    this.#headers ??= new Headers()
    this.#headers.set('Location', location)
    return this.newResponse(null, status)
  }

  /**
   * `.notFound()` can return the Not Found Response.
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   * @see https://hono.dev/api/context#notfound
   */
  notFound = (): Response | Promise<Response> => {
    return this.notFoundHandler(this)
  }
}
