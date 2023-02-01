import type {
  Input,
  InputToDataByType,
  ParamKeys,
  ParamKeyToRecord,
  RemoveQuestion,
  UndefinedIfHavingQuestion,
  ValidationTypes,
} from './types'
import { parseBody } from './utils/body'
import type { BodyData } from './utils/body'
import type { Cookie } from './utils/cookie'
import { parse } from './utils/cookie'
import type { UnionToIntersection } from './utils/types'
import { getQueryStringFromURL, getQueryParam, getQueryParams } from './utils/url'

export class HonoRequest<P extends string = '/', I extends Input = {}> {
  raw: Request

  private paramData: Record<string, string> | undefined
  private validatedData: { [K in keyof ValidationTypes]?: {} }
  private queryIndex: number

  constructor(
    request: Request,
    paramData?: Record<string, string> | undefined,
    queryIndex: number = -1
  ) {
    this.raw = request
    this.paramData = paramData
    this.queryIndex = queryIndex
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

  query(key: string): string
  query(): Record<string, string>
  query(key?: string) {
    const queryString = getQueryStringFromURL(this.url, this.queryIndex)
    return getQueryParam(queryString, key)
  }

  queries(key: string): string[]
  queries(): Record<string, string[]>
  queries(key?: string) {
    const queryString = getQueryStringFromURL(this.url, this.queryIndex)
    return getQueryParams(queryString, key)
  }

  header(name: string): string
  header(): Record<string, string>
  header(name?: string) {
    const headerData: Record<string, string> = {}
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value
    })
    if (name) {
      return headerData[name.toLowerCase()]
    } else {
      return headerData
    }
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
  async json<T = any>(): Promise<T> {
    return this.raw.json() as T
  }

  async text() {
    return this.raw.text()
  }

  async arrayBuffer() {
    return this.raw.arrayBuffer()
  }

  async blob() {
    return this.raw.blob()
  }

  async formData() {
    return this.raw.formData()
  }

  addValidatedData(type: keyof ValidationTypes, data: {}) {
    this.validatedData[type] = data
  }

  valid<
    T extends keyof ValidationTypes = I extends Record<infer R, unknown>
      ? R extends keyof ValidationTypes
        ? R
        : never
      : never
  >(type: T): InputToDataByType<I, T>
  valid(type: never): never
  valid(type: keyof ValidationTypes) {
    if (type) {
      return this.validatedData[type] as unknown
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
