import { hc as HonoClient } from '../../client/index.ts'
import type { Hono } from '../../hono.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractEnv<T> = T extends Hono<infer E, any, any> ? E : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hc = <T extends Hono<any, any, any>>(
  app: T,
  Env?: ExtractEnv<T>['Bindings'] | {},
  executionCtx?: ExecutionContext
) => {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return app.request(input, init, Env, executionCtx)
  }

  return HonoClient<typeof app>('', { fetch: customFetch })
}
