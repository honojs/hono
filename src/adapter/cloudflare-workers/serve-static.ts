// @denoify-ignore
import type { KVNamespace } from '@cloudflare/workers-types'
import type { Context } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'
import { getFilePath } from '../../utils/filepath'
import { getMimeType } from '../../utils/mime'
import { getContentFromKVAsset } from './utils'

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  manifest?: object | string
  namespace?: KVNamespace
  rewriteRequestPath?: (path: string) => string
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const DEFAULT_DOCUMENT = 'index.html'

// This middleware is available only on Cloudflare Workers.
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> = { root: '' }
): MiddlewareHandler => {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }

    const url = new URL(c.req.url)
    const filename = options.path ?? decodeURI(url.pathname)
    const path = getFilePath({
      filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) return await next()

    const content = await getContentFromKVAsset(path, {
      manifest: options.manifest,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      namespace: options.namespace ? options.namespace : c.env ? c.env.__STATIC_CONTENT : undefined,
    })

    if (content) {
      const mimeType = getMimeType(path)
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      // Return Response object
      return c.body(content)
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
}
