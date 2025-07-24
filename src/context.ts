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
import type { ContentfulStatusCode, RedirectStatusCode, StatusCode } from './utils/http-status'
import type { BaseMime } from './utils/mime'
import type {
  InvalidJSONValue,
  IsAny,
  JSONParsed,
  JSONValue,
  SimplifyDeepArray,
} from './utils/types'
import { safeEncodeURI } from './utils/url'

type HeaderRecord =
  | Record<'Content-Type', BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>

/**
 * Data type can be a string, ArrayBuffer, Uint8Array (buffer), or ReadableStream.
 */
export type Data = string | ArrayBuffer | ReadableStream | Uint8Array

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
  /**
   * For compatibility with Wrangler 4.x.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
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
  (data: Data | null, init?: ResponseOrInit): Response
}

/**
 * Interface for responding with a body.
 */
interface BodyRespond {
  // if we return content, only allow the status codes that allow for returning the body
  <U extends ContentfulStatusCode>(data: Data, status?: U, headers?: HeaderRecord): Response &
    TypedResponse<unknown, U, 'body'>
  <U extends StatusCode>(data: null, status?: U, headers?: HeaderRecord): Response &
    TypedResponse<null, U, 'body'>
  <U extends ContentfulStatusCode>(data: Data, init?: ResponseOrInit<U>): Response &
    TypedResponse<unknown, U, 'body'>
  <U extends StatusCode>(data: null, init?: ResponseOrInit<U>): Response &
    TypedResponse<null, U, 'body'>
}

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
  <T extends string, U extends ContentfulStatusCode = ContentfulStatusCode>(
    text: T,
    status?: U,
    headers?: HeaderRecord
  ): Response & TypedResponse<T, U, 'text'>
  <T extends string, U extends ContentfulStatusCode = ContentfulStatusCode>(
    text: T,
    init?: ResponseOrInit<U>
  ): Response & TypedResponse<T, U, 'text'>
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
    U extends ContentfulStatusCode = ContentfulStatusCode
  >(
    object: T,
    status?: U,
    headers?: HeaderRecord
  ): JSONRespondReturn<T, U>
  <
    T extends JSONValue | SimplifyDeepArray<unknown> | InvalidJSONValue,
    U extends ContentfulStatusCode = ContentfulStatusCode
  >(
    object: T,
    init?: ResponseOrInit<U>
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
  U extends ContentfulStatusCode
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
    status?: ContentfulStatusCode,
    headers?: HeaderRecord
  ): T extends string ? Response : Promise<Response>
  <T extends string | Promise<string>>(
    html: T,
    init?: ResponseOrInit<ContentfulStatusCode>
  ): T extends string ? Response : Promise<Response>
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

interface ResponseInit<T extends StatusCode = StatusCode> {
  headers?: ResponseHeadersInit
  status?: T
  statusText?: string
}

type ResponseOrInit<T extends StatusCode = StatusCode> = ResponseInit<T> | Response

export const TEXT_PLAIN = 'text/plain; charset=UTF-8'

const setDefaultContentType = (contentType: string, headers?: HeaderRecord): HeaderRecord => {
  return {
    'Content-Type': contentType,
    ...headers,
  }
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

  #status: StatusCode | undefined
  #executionCtx: FetchEventLike | ExecutionContext | undefined
  #res: Response | undefined
  #layout: Layout<PropsForRenderer & { Layout: Layout }> | undefined
  #renderer: Renderer | undefined
  #notFoundHandler: NotFoundHandler<E> | undefined
  #preparedHeaders: Headers | undefined

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
    return (this.#res ||= new Response(null, {
      headers: (this.#preparedHeaders ??= new Headers()),
    }))
  }

  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res: Response | undefined) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res)
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
   * @see {@link https://hono.dev/docs/api/context#header}
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
    if (this.finalized) {
      this.#res = new Response((this.#res as Response).body, this.#res)
    }
    const headers = this.#res ? this.#res.headers : (this.#preparedHeaders ??= new Headers())
    if (value === undefined) {
      headers.delete(name)
    } else if (options?.append) {
      headers.append(name, value)
    } else {
      headers.set(name, value)
    }
  }

  status = (status: StatusCode): void => {
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
   *   c.set('message', 'Hono is hot!!')
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
    arg?: StatusCode | ResponseOrInit,
    headers?: HeaderRecord
  ): Response {
    const responseHeaders = this.#res
      ? new Headers(this.#res.headers)
      : this.#preparedHeaders ?? new Headers()

    if (typeof arg === 'object' && 'headers' in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers)
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === 'set-cookie') {
          responseHeaders.append(key, value)
        } else {
          responseHeaders.set(key, value)
        }
      }
    }

    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === 'string') {
          responseHeaders.set(k, v)
        } else {
          responseHeaders.delete(k)
          for (const v2 of v) {
            responseHeaders.append(k, v2)
          }
        }
      }
    }

    const status = typeof arg === 'number' ? arg : arg?.status ?? this.#status
    return new Response(data, { status, headers: responseHeaders })
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
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ): ReturnType<BodyRespond> => this.#newResponse(data, arg, headers) as ReturnType<BodyRespond>

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
    arg?: ContentfulStatusCode | ResponseOrInit,
    headers?: HeaderRecord
  ): ReturnType<TextRespond> => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized
      ? (new Response(text) as ReturnType<TextRespond>)
      : (this.#newResponse(
          text,
          arg,
          setDefaultContentType(TEXT_PLAIN, headers)
        ) as ReturnType<TextRespond>)
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
    U extends ContentfulStatusCode = ContentfulStatusCode
  >(
    object: T,
    arg?: U | ResponseOrInit<U>,
    headers?: HeaderRecord
  ): JSONRespondReturn<T, U> => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType('application/json', headers)
    ) /* eslint-disable @typescript-eslint/no-explicit-any */ as any
  }

  html: HTMLRespond = (
    html: string | Promise<string>,
    arg?: ContentfulStatusCode | ResponseOrInit<ContentfulStatusCode>,
    headers?: HeaderRecord
  ): Response | Promise<Response> => {
    const res = (html: string) =>
      this.#newResponse(html, arg, setDefaultContentType('text/html; charset=UTF-8', headers))
    return typeof html === 'object'
      ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res)
      : res(html)
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
    this.header('Location', safeEncodeURI(String(location)))
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
