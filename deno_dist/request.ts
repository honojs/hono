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
import { getQueryParam, getQueryParams } from './utils/url.ts'

export class HonoRequest<P extends string = '/', I extends Input['out'] = {}> {
  raw: Request

  private paramData: Record<string, string> | undefined
  private validatedData: { [K in keyof ValidationTargets]?: {} }
  path: string

  constructor(
    request: Request,
    path: string = '/',
    paramData?: Record<string, string> | undefined
  ) {
    this.raw = request
    this.path = path
    this.paramData = paramData
    this.validatedData = {}
  }

  param(key: RemoveQuestion<ParamKeys<P>>): UndefinedIfHavingQuestion<ParamKeys<P>>
  param(): UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>>
  param(key?: string): unknown {
    if (this.paramData) {
      if (key) {
        const param = this.paramData[key]
        return param ? (/\%/.test(param) ? decodeURIComponent(param) : param) : undefined
      } else {
        const decoded: Record<string, string> = {}

        for (const [key, value] of Object.entries(this.paramData)) {
          if (value && typeof value === 'string') {
            decoded[key] = /\%/.test(value) ? decodeURIComponent(value) : value
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
    const headerData: Record<string, string> = {}
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value
    })
    if (!name) {
      return headerData
    }
    return headerData[name.toLowerCase()] || undefined
  }

  cookie(key: string): string | undefined
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

  async parseBody(): Promise<BodyData> {
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
    this.validatedData[target] = data
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
      return this.validatedData[target] as unknown
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
  get redirect() {
    return this.raw.redirect
  }
  get body() {
    return this.raw.body
  }
  get bodyUsed() {
    return this.raw.bodyUsed
  }
  get cache() {
    return this.raw.cache
  }
  get credentials() {
    return this.raw.credentials
  }
  get integrity() {
    return this.raw.integrity
  }
  get keepalive() {
    return this.raw.keepalive
  }
  get mode() {
    return this.raw.mode
  }
  get referrer() {
    return this.raw.referrer
  }
  get refererPolicy() {
    return this.raw.referrerPolicy
  }
  get signal() {
    return this.raw.signal
  }
}
