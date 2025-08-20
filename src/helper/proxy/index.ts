/**
 * @module
 * Proxy Helper for Hono.
 */

import type { RequestHeader } from '../../utils/headers'

// https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1
const hopByHopHeaders = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
]

interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
  raw?: Request
  headers?:
    | HeadersInit
    | [string, string][]
    | Record<RequestHeader, string | undefined>
    | Record<string, string | undefined>
}

/**
 * Options for proxy function
 * @example
 * { fetch: customFetch } // Use custom fetch function instead of the global `fetch`
 */
type ProxyOptions = {
  fetch: typeof fetch
}

interface ProxyFetch {
  (
    input: string | URL | Request,
    init?: ProxyRequestInit,
    options?: ProxyOptions
  ): Promise<Response>
}

const buildRequestInitFromRequest = (
  request: Request | undefined
): RequestInit & { duplex?: 'half' } => {
  if (!request) {
    return {}
  }

  const headers = new Headers(request.headers)
  hopByHopHeaders.forEach((header) => {
    headers.delete(header)
  })

  return {
    method: request.method,
    body: request.body,
    duplex: request.body ? 'half' : undefined,
    headers,
    signal: request.signal,
  }
}

const preprocessRequestInit = (requestInit: RequestInit): RequestInit => {
  if (
    !requestInit.headers ||
    Array.isArray(requestInit.headers) ||
    requestInit.headers instanceof Headers
  ) {
    return requestInit
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(requestInit.headers)) {
    if (value == null) {
      // delete header if value is null or undefined
      headers.delete(key)
    } else {
      headers.set(key, value)
    }
  }
  requestInit.headers = headers
  return requestInit
}

/**
 * Fetch API wrapper for proxy.
 * The parameters and return value are the same as for `fetch` (except for the proxy-specific options).
 *
 * The “Accept-Encoding” header is replaced with an encoding that the current runtime can handle.
 * Unnecessary response headers are deleted and a Response object is returned that can be returned
 * as is as a response from the handler.
 *
 * @example
 * ```ts
 * app.get('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     headers: {
 *       ...c.req.header(), // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   }).then((res) => {
 *     res.headers.delete('Set-Cookie')
 *     return res
 *   })
 * })
 *
 * app.all('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     ...c.req, // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *     headers: {
 *       ...c.req.header(),
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   })
 * })
 * ```
 */
export const proxy: ProxyFetch = async (input, proxyInit, options) => {
  const { raw, ...requestInit } =
    proxyInit instanceof Request ? { raw: proxyInit } : proxyInit ?? {}

  const req = new Request(input, {
    ...buildRequestInitFromRequest(raw),
    ...preprocessRequestInit(requestInit as RequestInit),
  })
  req.headers.delete('accept-encoding')

  const res = await (options?.fetch || fetch)(req)
  const resHeaders = new Headers(res.headers)
  hopByHopHeaders.forEach((header) => {
    resHeaders.delete(header)
  })
  if (resHeaders.has('content-encoding')) {
    resHeaders.delete('content-encoding')
    // Content-Length is the size of the compressed content, not the size of the original content
    resHeaders.delete('content-length')
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  })
}
