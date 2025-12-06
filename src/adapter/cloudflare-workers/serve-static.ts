import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions as BaseServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'
import { getContentFromKVAsset } from './utils'

export type ServeStaticOptions<E extends Env = Env> = BaseServeStaticOptions<E> & {
  // namespace is KVNamespace
  namespace?: unknown
  manifest: object | string
}

/**
 * @deprecated
 * `serveStatic` in the Cloudflare Workers adapter is deprecated.
 * You can serve static files directly using Cloudflare Static Assets.
 * @see https://developers.cloudflare.com/workers/static-assets/
 * Cloudflare Static Assets is currently in open beta. If this doesn't work for you,
 * please consider using Cloudflare Pages. You can start to create the Cloudflare Pages
 * application with the `npm create hono@latest` command.
 */
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
