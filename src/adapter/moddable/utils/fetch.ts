const METHOD_MAP = {
  GET: 'GET',
  get: 'GET',
  POST: 'POST',
  post: 'POST',
  PUT: 'PUT',
  put: 'PUT',
  DELETE: 'DELETE',
  delete: 'DELETE',
  HEAD: 'HEAD',
  head: 'HEAD',
  OPTIONS: 'OPTIONS',
  options: 'OPTIONS',
  PATCH: 'PATCH',
  patch: 'PATCH',
}
export const normalizeMethod = (method: string): string => {
  if (method in METHOD_MAP) {
    return METHOD_MAP[method as keyof typeof METHOD_MAP]
  }
  return method.toUpperCase()
}

export function initHeaders(headers?: HeadersInit): Headers {
  const initHeaders = new Headers()
  if (headers) {
    if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        initHeaders.set(key, value)
      }
    } else if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        initHeaders.set(key, value)
      })
    } else {
      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined || value === null) {
          continue
        }
        initHeaders.set(key, value)
      }
    }
  }
  return initHeaders
}
export function initBody(bodyInit: BodyInit | null): ReadableStream<Uint8Array> | null {
  if (bodyInit === null) {
    return null
  }
  if (bodyInit instanceof ReadableStream) {
    return bodyInit
  }
  if (bodyInit instanceof ArrayBuffer) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(bodyInit))
        controller.close()
      },
    })
  }
  if (bodyInit instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bodyInit)
        controller.close()
      },
    })
  }
  if (typeof bodyInit === 'string') {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bodyInit))
        controller.close()
      },
    })
  }
  if (bodyInit instanceof URLSearchParams) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bodyInit.toString()))
        controller.close()
      },
    })
  }
  throw new TypeError('Unsupported body type')
}
export class AdapterRequest implements Request {
  cache: RequestCache
  credentials: RequestCredentials
  destination: RequestDestination
  headers: Headers
  integrity: string
  method: string
  mode: RequestMode
  url: string
  redirect: RequestRedirect
  referrer: string
  referrerPolicy: ReferrerPolicy
  keepalive: boolean
  signal: AbortSignal
  body: ReadableStream<Uint8Array> | null
  bodyUsed: boolean

  constructor(input: string | URL | AdapterRequest, init?: RequestInit) {
    this.cache = input instanceof AdapterRequest ? input.cache : init?.cache ?? 'default'
    this.credentials =
      input instanceof AdapterRequest ? input.credentials : init?.credentials ?? 'same-origin'
    this.destination = input instanceof AdapterRequest ? input.destination : ''
    this.headers = input instanceof AdapterRequest ? input.headers : new Headers()
    if (init?.headers) {
      this.headers = initHeaders(init.headers)
    }
    this.integrity = input instanceof AdapterRequest ? input.integrity : init?.integrity ?? ''
    this.method = normalizeMethod(
      input instanceof AdapterRequest ? input.method : init?.method ?? 'GET'
    )
    this.mode = input instanceof AdapterRequest ? input.mode : init?.mode ?? 'cors'
    this.url =
      input instanceof AdapterRequest
        ? input.url
        : typeof input === 'string'
        ? input
        : input.toString()
    this.redirect = input instanceof AdapterRequest ? input.redirect : init?.redirect ?? 'follow'
    this.referrer = input instanceof AdapterRequest ? input.referrer : init?.referrer ?? ''
    this.referrerPolicy =
      input instanceof AdapterRequest ? input.referrerPolicy : init?.referrerPolicy ?? ''
    this.keepalive = input instanceof AdapterRequest ? input.keepalive : init?.keepalive ?? false
    if (input instanceof AdapterRequest) {
      this.signal = input.signal
    } else if (init?.signal) {
      this.signal = init.signal
    } else {
      const controller = new AbortController()
      this.signal = controller.signal
    }
    this.body =
      input instanceof AdapterRequest ? input.body : initBody((init?.body as BodyInit) ?? null)
    this.bodyUsed = input instanceof AdapterRequest ? input.bodyUsed : false
  }
  clone(): AdapterRequest {
    const [oldBody, newBody] = this.body ? this.body.tee() : [null, null]
    this.body = oldBody
    return newBody
      ? new AdapterRequest(this, {
          body: newBody,
        })
      : new AdapterRequest(this)
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    if (!this.body) {
      return Promise.resolve(new ArrayBuffer(0))
    }
    let buff = new Uint8Array()
    const reader = this.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buff = new Uint8Array([...buff, ...value])
    }
    return buff.buffer
  }
  async text(): Promise<string> {
    if (!this.body) {
      return ''
    }
    const arrayBuffer = await this.arrayBuffer()
    return new TextDecoder().decode(arrayBuffer)
  }
  async json(): Promise<unknown> {
    const text = await this.text()
    return JSON.parse(text)
  }
  async formData(): Promise<FormData> {
    // FormData does not exist in the Moddable environment
    throw new Error('FormData is not supported in moddable')
  }
  async blob(): Promise<Blob> {
    // Blob does not exist in the Moddable environment
    throw new Error('Blob is not supported in moddable')
  }
  async bytes(): Promise<Uint8Array> {
    return new Uint8Array(await this.arrayBuffer())
  }
}

export class AdapterResponse implements Response {
  headers: Headers
  ok: boolean
  status: number
  redirected: boolean
  statusText: string
  type: ResponseType = 'default'
  url: string = '/'
  body: ReadableStream<Uint8Array<ArrayBufferLike>> | null
  bodyUsed: boolean = false
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.headers = initHeaders(init?.headers)
    this.status = init?.status ?? 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = init?.statusText ?? ''
    this.redirected = false
    this.body = initBody(body ?? null)
  }

  clone(): AdapterResponse {
    const [oldBody, newBody] = this.body ? this.body.tee() : [null, null]
    this.body = oldBody
    return newBody
      ? new AdapterResponse(newBody, {
          headers: this.headers,
          status: this.status,
          statusText: this.statusText,
        })
      : new AdapterResponse(this.body, {
          headers: this.headers,
          status: this.status,
          statusText: this.statusText,
        })
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (!this.body) {
      return Promise.resolve(new ArrayBuffer(0))
    }
    let buff = new Uint8Array()
    const reader = this.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buff = new Uint8Array([...buff, ...value])
    }
    return buff.buffer
  }
  async text(): Promise<string> {
    if (!this.body) {
      return ''
    }
    const arrayBuffer = await this.arrayBuffer()
    return new TextDecoder().decode(arrayBuffer)
  }
  async json(): Promise<unknown> {
    const text = await this.text()
    return JSON.parse(text)
  }
  async formData(): Promise<FormData> {
    // FormData does not exist in the Moddable environment
    throw new Error('FormData is not supported in moddable')
  }
  async blob(): Promise<Blob> {
    // Blob does not exist in the Moddable environment
    throw new Error('Blob is not supported in moddable')
  }
  async bytes(): Promise<Uint8Array> {
    return new Uint8Array(await this.arrayBuffer())
  }
}
