/**
 * @module
 * Testing Helper for Hono.
 */

import { hc } from '../../client'
import type { Client, ClientRequestOptions } from '../../client/types'
import type { ExecutionContext } from '../../context'
import type { Hono } from '../../hono'
import type { Schema } from '../../types'
import type { UnionToIntersection } from '../../utils/types'

type ExtractEnv<T> = T extends Hono<infer E, Schema, string> ? E : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const testClient = <T extends Hono<any, Schema, string>>(
  app: T,
  Env?: ExtractEnv<T>['Bindings'] | {},
  executionCtx?: ExecutionContext,
  options?: Omit<ClientRequestOptions, 'fetch'>
): UnionToIntersection<Client<T, 'http://localhost'>> => {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return app.request(input, init, Env, executionCtx)
  }

  return hc<typeof app, 'http://localhost'>('http://localhost', { ...options, fetch: customFetch })
}

/**
 * Buffers the response body to prevent async leak detection false positives.
 *
 * Test runners with async leak detection (e.g. `vitest --detect-async-leaks`)
 * flag the unconsumed `ReadableStream` body of Response objects created by
 * `c.json()`, `c.text()`, etc. as leaked Promises.
 *
 * Use this helper to wrap `app.request()` calls in tests:
 * ```ts
 * import { bufferResponse } from 'hono/testing'
 *
 * const res = await bufferResponse(app.request('/api'))
 * expect(res.status).toBe(200)
 * ```
 *
 * @param response - A Response or Promise<Response> from `app.request()`
 * @returns A new Response with the body buffered as an ArrayBuffer
 */
export const bufferResponse = async (
  response: Response | Promise<Response>
): Promise<Response> => {
  const res = response instanceof Promise ? await response : response
  if (!res.body || res.bodyUsed) {
    return res
  }
  const body = await res.arrayBuffer()
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: new Headers(res.headers),
  })
}
