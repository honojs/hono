import type { TypedResponse } from './types'
import type { StatusCode } from './utils/http-status'
import type { JSONValue, InterfaceToType } from './utils/types'

type HeaderRecord = Record<string, string | string[]>
type Data = string | ArrayBuffer | ReadableStream


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


export class HonoResponder {

    finalized: boolean = false

    protected _status: StatusCode = 200
    protected _pre: boolean = false
    protected _preS: number = 2
    protected _h: Headers | undefined = undefined
    protected _pH: Record<string, string> | undefined = undefined
    protected _res: Response | undefined

    get res(): Response {
        return (this._res ||= new Response('404 Not Found', { status: 404 }))
    }

    set res(_res: Response | undefined) {
        if (this._res && _res) {
            this._res.headers.delete('content-type')
            this._res.headers.forEach((v, k) => {
              _res.headers.set(k, v)
            })
          }
        this._res = _res
        this.finalized = true
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

      pretty = (prettyJSON: boolean, space: number = 2): void => {
        this._pre = prettyJSON
        this._preS = space
      }

      newResponse: NewResponse = (
        data: Data | null,
        arg?: StatusCode | ResponseInit,
        headers?: HeaderRecord
      ): Response => {
        // Optimized
        if (!headers && !this._h && !this._res && !arg && this._status === 200) {
          return new Response(data, {
            headers: this._pH,
          })
        }
    
        // Return Response immediately if arg is RequestInit.
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
        arg?: StatusCode | RequestInit,
        headers?: HeaderRecord
      ): Response => {
        return typeof arg === 'number'
          ? this.newResponse(data, arg, headers)
          : this.newResponse(data, arg)
      }
    
      text: TextRespond = (
        text: string,
        arg?: StatusCode | RequestInit,
        headers?: HeaderRecord
      ): Response => {
        // If the header is empty, return Response immediately.
        // Content-Type will be added automatically as `text/plain`.
        if (!this._pH) {
          if (!headers && !this._res && !this._h && !arg) {
            return new Response(text)
          }
          this._pH = {}
        }
        // If Content-Type is not set, we don't have to set `text/plain`.
        // Fewer the header values, it will be faster.
        if (this._pH['content-type']) {
          this._pH['content-type'] = 'text/plain; charset=UTF-8'
        }
        return typeof arg === 'number'
          ? this.newResponse(text, arg, headers)
          : this.newResponse(text, arg)
      }
    
      json: JSONRespond = <T = {}>(
        object: T,
        arg?: StatusCode | RequestInit,
        headers?: HeaderRecord
      ) => {
        const body = this._pre ? JSON.stringify(object, null, this._preS) : JSON.stringify(object)
        this._pH ??= {}
        this._pH['content-type'] = 'application/json; charset=UTF-8'
        return typeof arg === 'number'
          ? this.newResponse(body, arg, headers)
          : this.newResponse(body, arg)
      }
    
      jsonT: JSONTRespond = <T>(
        object: InterfaceToType<T> extends JSONValue ? T : JSONValue,
        arg?: StatusCode | RequestInit,
        headers?: HeaderRecord
      ): TypedResponse<
        InterfaceToType<T> extends JSONValue
          ? JSONValue extends InterfaceToType<T>
            ? never
            : T
          : never
      > => {
        return {
          response: typeof arg === 'number' ? this.json(object, arg, headers) : this.json(object, arg),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: object as any,
          format: 'json',
        }
      }
    
      html: HTMLRespond = (
        html: string,
        arg?: StatusCode | RequestInit,
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

}