import type { Context } from '../../context.ts'
import type { Env, MiddlewareHandler } from '../../types.ts'

export const SSG_CONTEXT = 'HONO_SSG_CONTEXT'
export const SSG_DISABLED_RESPONSE = new Response('SSG is disabled', { status: 404 })

interface SSGParam {
  [key: string]: string
}
export type SSGParams = SSGParam[]

interface SSGParamsMiddleware {
  <E extends Env = Env>(
    generateParams: (c: Context<E>) => SSGParams | Promise<SSGParams>
  ): MiddlewareHandler<E>
  <E extends Env = Env>(params: SSGParams): MiddlewareHandler<E>
}

export type AddedSSGDataRequest = Request & {
  ssgParams?: SSGParams
}

/**
 * Define SSG Route
 */
export const ssgParams: SSGParamsMiddleware = (params) => async (c, next) => {
  ;(c.req.raw as AddedSSGDataRequest).ssgParams = Array.isArray(params) ? params : await params(c)
  await next()
}

/**
 * @experimental
 * `isSSGContext` is an experimental feature.
 * The API might be changed.
 */
export const isSSGContext = (c: Context): boolean => !!c.env?.[SSG_CONTEXT]

/**
 * @experimental
 * `disableSSG` is an experimental feature.
 * The API might be changed.
 */
export const disableSSG = (): MiddlewareHandler =>
  async function disableSSG(c, next) {
    if (isSSGContext(c)) {
      return SSG_DISABLED_RESPONSE
    }
    await next()
  }

/**
 * @experimental
 * `onlySSG` is an experimental feature.
 * The API might be changed.
 */
export const onlySSG = (): MiddlewareHandler =>
  async function onlySSG(c, next) {
    if (!isSSGContext(c)) {
      return c.notFound()
    }
    await next()
  }
