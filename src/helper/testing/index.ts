/**
 * @module
 * Testing Helper for Hono.
 */

import { hc } from '../../client'
import type { Client } from '../../client/types'
import type { ExecutionContext } from '../../context'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import type { UnionToIntersection } from '../../utils/types'

type ExtractEnv<T> = T extends Hono<infer E, Schema, string> ? E : never

export const testClient = <T extends Hono<Env, Schema, string>>(
  app: T,
  Env?: ExtractEnv<T>['Bindings'] | {},
  executionCtx?: ExecutionContext
): UnionToIntersection<Client<T>> => {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return app.request(input, init, Env, executionCtx)
  }

  return hc<typeof app>('http://localhost', { fetch: customFetch })
}
