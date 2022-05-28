/*
  This Response object is for better performance.
  This object is used in a Context before the Handler dispatches.
*/

import type { Data } from './context'
const errorMessage = 'Response is not finalized'

export class HonoResponse implements Response {
  headers: Headers
  ok: boolean
  redirected: boolean
  status: number
  statusText: string
  type: ResponseType
  url: string
  _finalized: boolean

  constructor(_data: Data | null, init: ResponseInit) {
    this.headers = new Headers(init.headers)
    this.status = init.status ?? 404
    this._finalized = false
  }

  clone(): Response {
    throw new Error(errorMessage)
  }

  body: ReadableStream<Uint8Array> | null
  bodyUsed: boolean
  arrayBuffer(): Promise<ArrayBuffer>
  arrayBuffer(): Promise<ArrayBuffer>
  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error(errorMessage)
  }
  blob(): Promise<Blob>
  blob(): Promise<Blob>
  blob(): Promise<Blob> {
    throw new Error(errorMessage)
  }
  formData(): Promise<FormData>
  formData(): Promise<FormData>
  formData(): Promise<FormData> {
    throw new Error(errorMessage)
  }
  json(): Promise<any>
  json<T>(): Promise<T>
  json<T>(): Promise<any> | Promise<T> {
    throw new Error(errorMessage)
  }
  text(): Promise<string>
  text(): Promise<string>
  text(): Promise<string> {
    throw new Error(errorMessage)
  }
}
