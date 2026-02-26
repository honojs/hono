/**
 * @module
 * Testing Helper for Hono.
 */

import { hc } from '../../client'
import type { Client, ClientRequestOptions } from '../../client/types'
import type { ExecutionContext } from '../../context'
import type { Hono } from '../../hono'
import type { BlankSchema, Env, Schema } from '../../types'
import type { UnionToIntersection } from '../../utils/types'

export const testClient = <E extends Env = Env, S extends Schema = BlankSchema>(
  app: Hono<E, S, string>,
  env?: E['Bindings'] | {},
  executionCtx?: ExecutionContext,
  options?: Omit<ClientRequestOptions, 'fetch'>
): UnionToIntersection<Client<typeof app, 'http://localhost'>> => {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return app.request(input, init, env, executionCtx)
  }

  return hc<typeof app, 'http://localhost'>('http://localhost', { ...options, fetch: customFetch })
}
