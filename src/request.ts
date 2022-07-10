import type { Cookie } from './utils/cookie'
import { parse } from './utils/cookie'

declare global {
  interface Request<ParamKeyType extends string = string> {
    param: {
      (key: ParamKeyType): string
      (): Record<ParamKeyType, string>
    }
    paramData?: Record<ParamKeyType, string>
    query: {
      (key: string): string
      (): Record<string, string>
    }
    queries: {
      (key: string): string[]
      (): Record<string, string[]>
    }
    header: {
      (name: string): string
      (): Record<string, string>
    }
    cookie: {
      (name: string): string
      (): Cookie
    }
  }
}

export function extendRequestPrototype() {
  if (!!Request.prototype.param as boolean) {
    // already extended
    return
  }

  Request.prototype.param = function (this: Request, key?: string) {
    if (this.paramData) {
      if (key) {
        return this.paramData[key]
      } else {
        return this.paramData
      }
    }
    return null
  } as InstanceType<typeof Request>['param']

  Request.prototype.header = function (this: Request, name?: string) {
    if (name) {
      return this.headers.get(name)
    } else {
      const result: Record<string, string> = {}
      for (const [key, value] of this.headers) {
        result[key] = value
      }
      return result
    }
  } as InstanceType<typeof Request>['header']

  Request.prototype.query = function (this: Request, key?: string) {
    const url = new URL(this.url)
    if (key) {
      return url.searchParams.get(key)
    } else {
      const result: Record<string, string> = {}
      for (const key of url.searchParams.keys()) {
        result[key] = url.searchParams.get(key) || ''
      }
      return result
    }
  } as InstanceType<typeof Request>['query']

  Request.prototype.queries = function (this: Request, key?: string) {
    const url = new URL(this.url)
    if (key) {
      return url.searchParams.getAll(key)
    } else {
      const result: Record<string, string[]> = {}
      for (const key of url.searchParams.keys()) {
        result[key] = url.searchParams.getAll(key)
      }
      return result
    }
  } as InstanceType<typeof Request>['queries']

  Request.prototype.cookie = function (this: Request, key?: string) {
    const cookie = this.headers.get('Cookie') || ''
    const obj = parse(cookie)
    if (key) {
      const value = obj[key]
      return value
    } else {
      return obj
    }
  } as InstanceType<typeof Request>['cookie']
}
