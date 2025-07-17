import { AdapterRequest, AdapterResponse, initBody, initHeaders, normalizeMethod } from './fetch'

describe('normalizeMethod', () => {
  it('Should normalize HTTP methods to uppercase', () => {
    expect(normalizeMethod('get')).toBe('GET')
    expect(normalizeMethod('post')).toBe('POST')
    expect(normalizeMethod('put')).toBe('PUT')
    expect(normalizeMethod('delete')).toBe('DELETE')
    expect(normalizeMethod('patch')).toBe('PATCH')
    expect(normalizeMethod('CuStOm')).toBe('CUSTOM')
  })
})
describe('initHeaders', () => {
  it('Should return empty headers if input is undefined', () => {
    const headers = initHeaders()
    expect(headers instanceof Headers).toBe(true)
    expect([...headers.entries()]).toEqual([])
  })
  it('Should initialize headers from Headers object', () => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const clonedHeaders = initHeaders(headers)
    expect([...clonedHeaders.entries()]).toEqual([...headers.entries()])
  })
  it('Should initialize headers from an object', () => {
    const headers = initHeaders({
      'Content-Type': 'application/json',
      'X-Custom-Header': 'value',
      nullHeader: null as unknown as string,
    })
    expect(Object.fromEntries(headers.entries())).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'value',
    })
  })
  it('Should initialize headers from an array', () => {
    const headers = initHeaders([
      ['Content-Type', 'application/json'],
      ['X-Custom-Header', 'value'],
    ])
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Custom-Header')).toBe('value')
  })
})
describe('initBody', () => {
  it('Should return null for null bodyInit', () => {
    const body = initBody(null)
    expect(body).toBeNull()
  })
  it('Should return input if it is a ReadableStream', () => {
    const stream = new ReadableStream<Uint8Array>({})
    const body = initBody(stream)
    expect(body).toBe(stream)
  })
  it('Should convert ArrayBuffer to ReadableStream', async () => {
    const buffer = new ArrayBuffer(8)
    const body = initBody(buffer)
    expect(body instanceof ReadableStream).toBe(true)
    const reader = body?.getReader()
    expect(await reader?.read()).toEqual({ done: false, value: new Uint8Array(buffer) })
    expect(await reader?.read()).toEqual({ done: true, value: undefined })
  })
  it('Should convert Uint8Array to ReadableStream', async () => {
    const body = initBody(new Uint8Array([1, 2, 3]))
    expect(body instanceof ReadableStream).toBe(true)
    const reader = body?.getReader()
    expect(await reader?.read()).toEqual({ done: false, value: new Uint8Array([1, 2, 3]) })
    expect(await reader?.read()).toEqual({ done: true, value: undefined })
  })
  it('Should convert string to ReadableStream', async () => {
    const body = initBody('Hello World')
    expect(body instanceof ReadableStream).toBe(true)
    const reader = body?.getReader()
    expect(await reader?.read()).toEqual({
      done: false,
      value: new TextEncoder().encode('Hello World'),
    })
    expect(await reader?.read()).toEqual({ done: true, value: undefined })
  })
  it('Should convert URLSearchParams to ReadableStream', async () => {
    const params = new URLSearchParams('key1=value1&key2=value2')
    const body = initBody(params)
    expect(body instanceof ReadableStream).toBe(true)
    const reader = body?.getReader()
    expect(await reader?.read()).toEqual({
      done: false,
      value: new TextEncoder().encode('key1=value1&key2=value2'),
    })
    expect(await reader?.read()).toEqual({ done: true, value: undefined })
  })
  it('Should throw TypeError for unsupported body types', () => {
    expect(() => initBody({} as any)).toThrow(TypeError)
    expect(() => initBody(123 as any)).toThrow(TypeError)
    expect(() => initBody(new Blob(['test']))).toThrow(TypeError)
  })
})

describe('AdapterRequest', () => {
  it('Should create a request from URL object', () => {
    const url = new URL('https://example.com/path?query=1')
    const request = new AdapterRequest(url)
    expect(request.url).toBe(url.href)
  })
  it('Should create a request from AdapterRequest', () => {
    const originalRequest = new AdapterRequest('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'Hello World',
    })
    originalRequest.cache = 'no-store'
    originalRequest.credentials = 'include'
    originalRequest.destination = 'document'
    originalRequest.integrity = 'sha256-abc123'
    originalRequest.mode = 'cors'
    originalRequest.redirect = 'follow'
    originalRequest.referrer = 'https://example.com'
    originalRequest.referrerPolicy = 'no-referrer'
    originalRequest.keepalive = true
    originalRequest.signal = new AbortController().signal
    originalRequest.bodyUsed = false

    const request = new AdapterRequest(originalRequest)
    expect(request.method).toBe('POST')
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(request.body).toBeInstanceOf(ReadableStream)
    expect(request.url).toBe('https://example.com')

    expect(request.cache).toBe(originalRequest.cache)
    expect(request.credentials).toBe(originalRequest.credentials)
    expect(request.destination).toBe(originalRequest.destination)
    expect(request.integrity).toBe(originalRequest.integrity)
    expect(request.mode).toBe(originalRequest.mode)
    expect(request.redirect).toBe(originalRequest.redirect)
    expect(request.referrer).toBe(originalRequest.referrer)
    expect(request.referrerPolicy).toBe(originalRequest.referrerPolicy)
    expect(request.keepalive).toBe(originalRequest.keepalive)
    expect(request.signal).toBe(originalRequest.signal)
    expect(request.bodyUsed).toBe(originalRequest.bodyUsed)
  })
  it('Should create a request from object input', async () => {
    const request = new AdapterRequest('https://example.com', {
      body: 'Hello World',
      method: 'GET',
      headers: { 'Content-Type': 'text/plain' },
      signal: new AbortController().signal,
    })
    expect(request.method).toBe('GET')
    expect(request.headers.get('Content-Type')).toBe('text/plain')
    expect(await new Response(request.body).text()).toBe('Hello World')
  })
  it('Should .arrayBuffer() work correctly', async () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3, 4]).buffer,
    })
    const buffer = await request.arrayBuffer()
    expect(buffer).toEqual(new Uint8Array([1, 2, 3, 4]).buffer)
  })
  it('Should .arrayBuffer() return empty buffer if no body', async () => {
    const request = new AdapterRequest('https://example.com')
    const buffer = await request.arrayBuffer()
    expect(buffer).toEqual(new ArrayBuffer(0))
  })
  it('Should .clone() create a new request with a new body', () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3, 4]).buffer,
    })
    const clonedRequest = request.clone()
    expect(clonedRequest).not.toBe(request)
    expect(clonedRequest.method).toBe(request.method)
    expect(clonedRequest.url).toBe(request.url)
    expect(clonedRequest.body).toEqual(request.body)
  })
  it('Should .clone() create a new request if original body is null', () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'GET',
      body: null,
    })
    const clonedRequest = request.clone()
    expect(clonedRequest).not.toBe(request)
    expect(clonedRequest.method).toBe(request.method)
    expect(clonedRequest.url).toBe(request.url)
    expect(clonedRequest.body).toBeNull()
  })
  it('Should .text() return the body as text', async () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: 'Hello World',
    })
    const text = await request.text()
    expect(text).toBe('Hello World')
  })
  it('Should .text() return empty string if no body', async () => {
    const request = new AdapterRequest('https://example.com')
    const text = await request.text()
    expect(text).toBe('')
  })
  it('Should .json() parse JSON body', async () => {
    const obj = { key: 'value' }
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: JSON.stringify(obj),
    })
    const json = await request.json()
    expect(json).toEqual(obj)
  })
  it('Should .formData() throw error if body is not FormData', async () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: 'Hello World',
    })
    await expect(request.formData()).rejects.toThrow(Error)
  })
  it('Should .blob() throw error if body is not Blob', async () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: 'Hello World',
    })
    await expect(request.blob()).rejects.toThrow(Error)
  })
  it('Should .bytes() return body as Uint8Array', async () => {
    const request = new AdapterRequest('https://example.com', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3, 4]).buffer,
    })
    const bytes = await request.bytes()
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })
})

describe('AdapterResponse', () => {
  it('Should create a response with default values', () => {
    const response = new AdapterResponse()
    expect(response.status).toBe(200)
    expect(response.ok).toBe(true)
    expect(response.statusText).toBe('')
    expect(response.headers instanceof Headers).toBe(true)
    expect(response.body).toBeNull()
  })
  it('Should .clone() create a new response with the same body', async () => {
    const originalResponse = new AdapterResponse('Hello World', {
      status: 201,
      headers: { 'Content-Type': 'text/plain' },
    })
    const clonedResponse = originalResponse.clone()
    expect(clonedResponse.status).toBe(originalResponse.status)
    expect(await clonedResponse.text()).toBe(await originalResponse.text())
  })
  it('Should .clone() create a new response without body', () => {
    const originalResponse = new AdapterResponse(null, {
      status: 204,
      headers: { 'Content-Type': 'text/plain' },
    })
    const clonedResponse = originalResponse.clone()
    expect(clonedResponse.status).toBe(originalResponse.status)
    expect(clonedResponse.body).toBeNull()
  })
  it('Should .arrayBuffer() return the body as ArrayBuffer', async () => {
    const response = new AdapterResponse(new Uint8Array([1, 2, 3, 4]).buffer)
    const buffer = await response.arrayBuffer()
    expect(buffer).toEqual(new Uint8Array([1, 2, 3, 4]).buffer)
  })
  it('Should .arrayBuffer() return empty buffer if no body', async () => {
    const response = new AdapterResponse()
    const buffer = await response.arrayBuffer()
    expect(buffer).toEqual(new ArrayBuffer(0))
  })
  it('Should .text() return the body as text', async () => {
    const response = new AdapterResponse('Hello World')
    const text = await response.text()
    expect(text).toBe('Hello World')
  })
  it('Should .text() return empty string if no body', async () => {
    const response = new AdapterResponse()
    const text = await response.text()
    expect(text).toBe('')
  })
  it('Should .json() parse JSON body', async () => {
    const obj = { key: 'value' }
    const response = new AdapterResponse(JSON.stringify(obj), {
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()
    expect(json).toEqual(obj)
  })
  it('Should .formData() throw error if body is not FormData', async () => {
    const response = new AdapterResponse('Hello World')
    await expect(response.formData()).rejects.toThrow(Error)
  })
  it('Should .blob() throw error if body is not Blob', async () => {
    const response = new AdapterResponse('Hello World')
    await expect(response.blob()).rejects.toThrow(Error)
  })
  it('Should .bytes() return body as Uint8Array', async () => {
    const response = new AdapterResponse(new Uint8Array([1, 2, 3, 4]).buffer)
    const bytes = await response.bytes()
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })
})
