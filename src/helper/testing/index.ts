import { hc } from '../../client'
import type { Hono } from '../../hono'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractEnv<T> = T extends Hono<infer E, any, any> ? E : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const testClient = <T extends Hono<any, any, any>>(
  app: T,
  Env?: ExtractEnv<T>['Bindings'] | {},
  executionCtx?: ExecutionContext
) => {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return app.request(input, init, Env, executionCtx)
  }

  return hc<typeof app>('', { fetch: customFetch })
}
