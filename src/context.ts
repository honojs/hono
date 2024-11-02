import { HonoRequest } from './request'
import type { Result } from './router'
import type {
  Env,
  FetchEventLike,
  H,
  Input,
  NotFoundHandler,
  RouterRoute,
  TypedResponse,
} from './types'
import type { ResponseHeader } from './utils/headers'
import { HtmlEscapedCallbackPhase, resolveCallback } from './utils/html'
import type { RedirectStatusCode, StatusCode } from './utils/http-status'
import type { BaseMime } from './utils/mime'
import type {
  InvalidJSONValue,
  IsAny,
  JSONParsed,
  JSONValue,
  SimplifyDeepArray,
} from './utils/types'

type HeaderRecord =
  | Record<'Content-Type', BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>

/**
 * Data type can be a string, ArrayBuffer, or ReadableStream.
 */
export type Data = string | ArrayBuffer | ReadableStream

/**
 * Interface for the execution context in a web worker or similar environment.
 */
export interface ExecutionContext {
  /**
   * Extends the lifetime of the event callback until the promise is settled.
   *
   * @param promise - A promise to wait for.
   */
  waitUntil(promise: Promise<unknown>): void
  /**
   * Allows the event to be passed through to subsequent event listeners.
   */
  passThroughOnException(): void
}

/**
 * Interface for context variable mapping.
 */
export interface ContextVariableMap {}

/**
 * Interface for context renderer.
 */
export interface ContextRenderer {}

/**
 * Interface representing a renderer for content.
 *
 * @interface DefaultRenderer
 * @param {string | Promise<string>} content - The content to be rendered, which can be either a string or a Promise resolving to a string.
 * @returns {Response | Promise<Response>} - The response after rendering the content, which can be either a Response or a Promise resolving to a Response.
 */
interface DefaultRenderer {
  (content: string | Promise<string>): Response | Promise<Response>
}

/**
 * Renderer type which can either be a ContextRenderer or DefaultRenderer.
 */
export type Renderer = ContextRenderer extends Function ? ContextRenderer : DefaultRenderer

/**
 * Extracts the props for the renderer.
 */
export type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Layout<T = Record<string, any>> = (props: T) => any

/**
 * Interface for getting context variables.
 *
 * @template E - Environment type.
 */
interface Get<E extends Env> {
  <Key extends keyof E['Variables']>(key: Key): E['Variables'][Key]
  <Key extends keyof ContextVariableMap>(key: Key): ContextVariableMap[Key]
}

/**
 * Interface for setting context variables.
 *
 * @template E - Environment type.
 */
interface Set<E extends Env> {
  <Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void
  <Key extends keyof ContextVariableMap>(key: Key, value: ContextVariableMap[Key]): void
}

/**
 * Interface for creating a new response.
 */
interface NewResponse {
  (data: Data | null, status?: StatusCode, headers?: HeaderRecord): Response
  (data: Data | null, init?: ResponseInit): Response
}

/**
 * Interface for responding with a body.
 */
interface BodyRespond extends NewResponse {}

/**
 * Interface for responding with text.
 *
 * @interface TextRespond
 * @template T - The type of the text content.
 * @template U - The type of the status code.
 *
 * @param {T} text - The text content to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {Response & TypedResponse<T, U, 'text'>} - The response after rendering the text content, typed with the provided text and status code types.
 */
interface TextRespond {
  <T extends string, U extends StatusCode = StatusCode>(
    text: T,
    status?: U,
    headers?: HeaderRecord
  ): Response & TypedResponse<T, U, 'text'>
  <T extends string, U extends StatusCode = StatusCode>(text: T, init?: ResponseInit): Response &
    TypedResponse<T, U, 'text'>
}

/**
 * Interface for responding with JSON.
 *
 * @interface JSONRespond
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @param {T} object - The JSON object to be included in the response.
 * @param {U} [status] - An optional status code for the response.
 * @param {HeaderRecord} [headers] - An optional record of headers to include in the response.
 *
 * @returns {JSONRespondReturn<T, U>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
interface JSONRespond {
  <
    T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
    U extends StatusCode = StatusCode
  >(
    object: T,
    status?: U,
    headers?: HeaderRecord
  ): JSONRespondReturn<T, U>
  <
    T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
    U extends StatusCode = StatusCode
  >(
    object: T,
    init?: ResponseInit
  ): JSONRespondReturn<T, U>
}

/**
 * @template T - The type of the JSON value or simplified unknown type.
 * @template U - The type of the status code.
 *
 * @returns {Response & TypedResponse<SimplifyDeepArray<T> extends JSONValue ? (JSONValue extends SimplifyDeepArray<T> ? never : JSONParsed<T>) : never, U, 'json'>} - The response after rendering the JSON object, typed with the provided object and status code types.
 */
type JSONRespondReturn<
  T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
  U extends StatusCode
> = Response &
  TypedResponse<
    SimplifyDeepArray<T> extends JSONValue
      ? JSONValue extends SimplifyDeepArray<T>
        ? never
        : JSONParsed<T>
      : never,
    U,
    'json'
  >

/**
 * Interface representing a function that responds with HTML content.
 *
 * @param html - The HTML content to respond with, which can be a string or a Promise that resolves to a string.
 * @param status - (Optional) The HTTP status code for the response.
 * @param headers - (Optional) A record of headers to include in the response.
 * @param init - (Optional) The response initialization object.
 *
 * @returns A Response object or a Promise that resolves to a Response object.
 */
interface HTMLRespond {
  <T extends string | Promise<string>>(
    html: T,
    status?: StatusCode,
    headers?: HeaderRecord
  ): T extends string ? Response : Promise<Response>
  <T extends string | Promise<string>>(html: T, init?: ResponseInit): T extends string
    ? Response
    : Promise<Response>
}

/**
 * Options for configuring the context.
 *
 * @template E - Environment type.
 */
type ContextOptions<E extends Env> = {
  /**
   * Bindings for the environment.
   */
  env: E['Bindings']
  /**
   * Execution context for the request.
   */
  executionCtx?: FetchEventLike | ExecutionContext | undefined
  /**
   * Handler for not found responses.
   */
  notFoundHandler?: NotFoundHandler<E>
  matchResult?: Result<[H, RouterRoute]>
  path?: string
}

interface SetHeadersOptions {
  append?: boolean
}

interface SetHeaders {
  (name: 'Content-Type', value?: BaseMime, options?: SetHeadersOptions): void
  (name: ResponseHeader, value?: string, options?: SetHeadersOptions): void
  (name: string, value?: string, options?: SetHeadersOptions): void
}

type ResponseHeadersInit =
  | [string, string][]
  | Record<'Content-Type', BaseMime>
  | Record<ResponseHeader, string>
  | Record<string, string>
  | Headers

interface ResponseInit {
  headers?: ResponseHeadersInit
  status?: number
  statusText?: string
}

export const TEXT_PLAIN = 'text/plain; charset=UTF-8'

/**
 * Sets the headers of a response.
 *
 * @param headers - The Headers object to set the headers on.
 * @param map - A record of header key-value pairs to set.
 * @returns The updated Headers object.
 */
const setHeaders = (headers: Headers, map: Record<string, string> = {}) => {
  for (const key of Object.keys(map)) {
    headers.set(key, map[key])
  }
  return headers
}

export class Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
> {
  #rawRequest: Request
  #req: HonoRequest<P, I['out']> | undefined
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env: E['Bindings'] = {}
  #var: Map<unknown, unknown> | undefined
  finalized: boolean = false
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error: Error | undefined

  #status: StatusCode = 200
  #executionCtx: FetchEventLike | ExecutionContext | undefined
  #headers: Headers | undefined
  #preparedHeaders: Record<string, string> | undefined
  #res: Response | undefined
  #isFresh = true
  #layout: Layout<PropsForRenderer & { Layout: Layout }> | undefined
  #renderer: Renderer | undefined
  #notFoundHandler: NotFoundHandler<E> | undefined

  #matchResult: Result<[H, RouterRoute]> | undefined
  #path: string | undefined

  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req: Request, options?: ContextOptions<E>) {
    this.#rawRequest = req
    if (options) {
      this.#executionCtx = options.executionCtx
      this.env = options.env
      this.#notFoundHandler = options.notFoundHandler
      this.#path = options.path
      this.#matchResult = options.matchResult
    }
  }

  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req(): HonoRequest<P, I['out']> {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult)
    return this.#req
  }

  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event(): FetchEventLike {
    if (this.#executionCtx && 'respondWith' in this.#executionCtx) {
      return this.#executionCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx(): ExecutionContext {
    if (this.#executionCtx) {
      return this.#executionCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res(): Response {
    this.#isFresh = false
    return (this.#res ||= new Response('404 Not Found', { status: 404 }))
  }

  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res: Response | undefined) {
    this.#isFresh = false
    if (this.#res && _res) {
      try {
        for (const [k, v] of this.#res.headers.entries()) {
          if (k === 'content-type') {
            continue
          }
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
      } catch (e) {
        if (e instanceof TypeError && e.message.includes('immutable')) {
          // `_res` is immutable (probably a response from a fetch API), so retry with a new response.
          this.res = new Response(_res.body, {
            headers: _res.headers,
            status: _res.status,
          })
          return
        } else {
          throw e
        }
      }
    }
    this.#res = _res
    this.finalized = true
  }

  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render: Renderer = (...args) => {
    this.#renderer ??= (content: string | Promise<string>) => this.html(content)
    return this.#renderer(...args)
  }

  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (
    layout: Layout<PropsForRenderer & { Layout: Layout }>
  ): Layout<
    PropsForRenderer & {
      Layout: Layout
    }
  > => (this.#layout = layout)

  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = (): Layout<PropsForRenderer & { Layout: Layout }> | undefined => this.#layout

  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
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
   */
  setRenderer = (renderer: Renderer): void => {
    this.#renderer = renderer
  }

  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
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
   */
  header: SetHeaders = (name, value, options): void => {
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
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is cool!!')
   *   await next()
   * })
   * ```
   */
  set: Set<
    IsAny<E> extends true
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Variables: ContextVariableMap & Record<string, any>
        }
      : E
  > = (key: string, value: unknown) => {
    this.#var ??= new Map()
    this.#var.set(key, value)
  }

  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get: Get<
    IsAny<E> extends true
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Variables: ContextVariableMap & Record<string, any>
        }
      : E
  > = (key: string) => {
    return this.#var ? this.#var.get(key) : undefined
  }

  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var(): Readonly<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ContextVariableMap & (IsAny<E['Variables']> extends true ? Record<string, any> : E['Variables'])
  > {
    if (!this.#var) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any
    }
    return Object.fromEntries(this.#var)
  }

  #newResponse(
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response {
    // Optimized
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders,
      })
    }

    if (arg && typeof arg !== 'number') {
      const header = new Headers(arg.headers)
      if (this.#headers) {
        // If the header is set by c.header() and arg.headers, c.header() will be prioritized.
        this.#headers.forEach((v, k) => {
          if (k === 'set-cookie') {
            header.append(k, v)
          } else {
            header.set(k, v)
          }
        })
      }
      const headers = setHeaders(header, this.#preparedHeaders)
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
        if (k === 'set-cookie') {
          this.#headers?.append(k, v)
        } else {
          this.#headers?.set(k, v)
        }
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

  newResponse: NewResponse = (...args) => this.#newResponse(...(args as Parameters<NewResponse>))

  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
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
   */
  body: BodyRespond = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    return typeof arg === 'number'
      ? this.#newResponse(data, arg, headers)
      : this.#newResponse(data, arg)
  }

  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text: TextRespond = (
    text: string,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): ReturnType<TextRespond> => {
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        // @ts-expect-error `Response` due to missing some types-only keys
        return new Response(text)
      }
      this.#preparedHeaders = {}
    }
    this.#preparedHeaders['content-type'] = TEXT_PLAIN
    // @ts-expect-error `Response` due to missing some types-only keys
    return typeof arg === 'number'
      ? this.#newResponse(text, arg, headers)
      : this.#newResponse(text, arg)
  }

  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json: JSONRespond = <
    T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
    U extends StatusCode = StatusCode
  >(
    object: T,
    arg?: U | ResponseInit,
    headers?: HeaderRecord
  ): JSONRespondReturn<T, U> => {
    const body = JSON.stringify(object)
    this.#preparedHeaders ??= {}
    this.#preparedHeaders['content-type'] = 'application/json; charset=UTF-8'
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return (
      typeof arg === 'number' ? this.#newResponse(body, arg, headers) : this.#newResponse(body, arg)
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
      return resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then((html) => {
        return typeof arg === 'number'
          ? this.#newResponse(html, arg, headers)
          : this.#newResponse(html, arg)
      })
    }

    return typeof arg === 'number'
      ? this.#newResponse(html as string, arg, headers)
      : this.#newResponse(html as string, arg)
  }

  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = <T extends RedirectStatusCode = 302>(
    location: string | URL,
    status?: T
  ): Response & TypedResponse<undefined, T, 'redirect'> => {
    this.#headers ??= new Headers()
    this.#headers.set('Location', String(location))
    return this.newResponse(null, status ?? 302) as any
  }

  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = (): Response | Promise<Response> => {
    this.#notFoundHandler ??= () => new Response()
    return this.#notFoundHandler(this)
  }
}
