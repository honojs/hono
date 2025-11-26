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
