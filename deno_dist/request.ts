import type {
  Input,
  InputToDataByTarget,
  ParamKeys,
  ParamKeyToRecord,
  RemoveQuestion,
  UndefinedIfHavingQuestion,
  ValidationTargets,
} from './types.ts'
import { parseBody } from './utils/body.ts'
import type { BodyData } from './utils/body.ts'
import type { Cookie } from './utils/cookie.ts'
import { parse } from './utils/cookie.ts'
import type { UnionToIntersection } from './utils/types.ts'
import { getQueryParam, getQueryParams, decodeURIComponent_ } from './utils/url.ts'

export class HonoRequest<P extends string = '/', I extends Input['out'] = {}> {
  raw: Request

  private paramData: Record<string, string> | undefined
  private vData: { [K in keyof ValidationTargets]?: {} } // Short name of validatedData
  path: string

  constructor(
    request: Request,
    path: string = '/',
    paramData?: Record<string, string> | undefined
  ) {
    this.raw = request
    this.path = path
    this.paramData = paramData
    this.vData = {}
  }

  param(key: RemoveQuestion<ParamKeys<P>>): UndefinedIfHavingQuestion<ParamKeys<P>>
  param(): UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>>
  param(key?: string): unknown {
    if (this.paramData) {
      if (key) {
        const param = this.paramData[key]
        return param ? (/\%/.test(param) ? decodeURIComponent_(param) : param) : undefined
      } else {
        const decoded: Record<string, string> = {}

        for (const [key, value] of Object.entries(this.paramData)) {
          if (value && typeof value === 'string') {
            decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value
          }
        }

        return decoded
      }
    }
    return null
  }

  query(key: string): string | undefined
  query(): Record<string, string>
  query(key?: string) {
    return getQueryParam(this.url, key)
  }

  queries(key: string): string[] | undefined
  queries(): Record<string, string[]>
  queries(key?: string) {
    return getQueryParams(this.url, key)
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string) {
    if (name) return this.raw.headers.get(name.toLowerCase()) ?? undefined

    const headerData: Record<string, string | undefined> = {}
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value
    })
    return headerData
  }

  /** @deprecated
   * Use Cookie Middleware instead of `c.req.cookie()`. The `c.req.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { getCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => c.text(getCookie(c, 'cookie-name')))
   */
  cookie(key: string): string | undefined

  /** @deprecated
   * Use Cookie Middleware instead of `c.req.cookie()`. The `c.req.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { getCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => c.json(getCookie(c)))
   */
  cookie(): Cookie

  cookie(key?: string) {
    const cookie = this.raw.headers.get('Cookie')
    if (!cookie) return
    const obj = parse(cookie)
    if (key) {
      const value = obj[key]
      return value
    } else {
      return obj
    }
  }

  async parseBody<T extends BodyData = BodyData>(): Promise<T> {
    return await parseBody(this.raw)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json<T = any>(): Promise<T> {
    return this.raw.json()
  }

  text() {
    return this.raw.text()
  }

  arrayBuffer() {
    return this.raw.arrayBuffer()
  }

  blob() {
    return this.raw.blob()
  }

  formData() {
    return this.raw.formData()
  }

  addValidatedData(target: keyof ValidationTargets, data: {}) {
    this.vData[target] = data
  }

  valid<
    T extends keyof ValidationTargets = I extends Record<infer R, unknown>
      ? R extends keyof ValidationTargets
        ? R
        : never
      : never
  >(target: T): InputToDataByTarget<I, T>
  valid(): never
  valid(target?: keyof ValidationTargets) {
    if (target) {
      return this.vData[target] as unknown
    }
  }

  get url() {
    return this.raw.url
  }
  get method() {
    return this.raw.method
  }
  get headers() {
    return this.raw.headers
  }
  get body() {
    return this.raw.body
  }
  get bodyUsed() {
    return this.raw.bodyUsed
  }
  get integrity() {
    return this.raw.integrity
  }
  get keepalive() {
    return this.raw.keepalive
  }
  get referrer() {
    return this.raw.referrer
  }
  get signal() {
    return this.raw.signal
  }
}
