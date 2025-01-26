/**
 * @module
 * Proxy Helper for Hono.
 */

import type { HonoRequest } from '../../request'

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

interface ProxyRequestInit extends RequestInit {
  raw?: Request
}

interface ProxyFetch {
  (input: RequestInfo | URL, init?: ProxyRequestInit | HonoRequest): Promise<Response>
  (
    input: string | URL | globalThis.Request,
    init?: ProxyRequestInit | HonoRequest
  ): Promise<Response>
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
 *     res.headers.delete('Cookie')
 *     return res
 *   })
 * })
 *
 * app.any('/proxy/:path', (c) => {
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
export const proxy: ProxyFetch = async (input, proxyInit) => {
  const { raw, ...requestInit } = proxyInit ?? {}

  const requestInitRaw: RequestInit & { duplex?: 'half' } = raw
    ? {
        method: raw.method,
        body: raw.body,
        headers: raw.headers,
      }
    : {}
  if (requestInitRaw.body) {
    requestInitRaw.duplex = 'half'
  }
  if (requestInitRaw.headers) {
    hopByHopHeaders.forEach((header) => {
      ;(requestInitRaw.headers as Headers).delete(header)
    })
  }

  const req = new Request(input, {
    ...requestInitRaw,
    ...requestInit,
  })
  req.headers.delete('accept-encoding')

  const res = await fetch(req)
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
    ...res,
    headers: resHeaders,
  })
}
