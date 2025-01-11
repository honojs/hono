import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions as BaseServeStaticOptions } from '../../middleware/serve-static'
import type { DefaultEnv, Env, MiddlewareHandler } from '../../types'
import { getContentFromKVAsset } from './utils'

export type ServeStaticOptions<E extends Env = DefaultEnv> = BaseServeStaticOptions<E> & {
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
export const serveStatic = <E extends Env = DefaultEnv>(
  options: ServeStaticOptions<E>
): MiddlewareHandler<E> => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      return getContentFromKVAsset(path, {
        manifest: options.manifest,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        namespace: options.namespace
          ? options.namespace
          : c.env
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c.env as any).__STATIC_CONTENT
          : undefined,
      })
    }
    return baseServeStatic<E>({
      ...options,
      getContent,
    })(c, next)
  }
}
