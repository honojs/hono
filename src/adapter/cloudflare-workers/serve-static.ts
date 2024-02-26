// @denoify-ignore
import type { KVNamespace } from '@cloudflare/workers-types'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions as BaseServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'
import { getContentFromKVAsset } from './utils'

export type ServeStaticOptions<E extends Env = Env> = BaseServeStaticOptions<E> & {
  namespace?: KVNamespace
  manifest: object | string
}

// This middleware is available only on Cloudflare Workers.
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      return getContentFromKVAsset(path, {
        manifest: options.manifest,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        namespace: options.namespace
          ? options.namespace
          : c.env
          ? c.env.__STATIC_CONTENT
          : undefined,
      })
    }
    return baseServeStatic({
      ...options,
      getContent,
    })(c, next)
  }
}
