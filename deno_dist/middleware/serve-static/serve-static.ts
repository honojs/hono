import type { Context, Env } from '../../context.ts'
import type { Handler, Next } from '../../hono.ts'
import { getContentFromKVAsset, getKVFilePath } from '../../utils/cloudflare.ts'
import { getMimeType } from '../../utils/mime.ts'

export type ServeStaticOptions = {
  root?: string
  path?: string
  manifest?: object | string
  namespace?: KVNamespace
}

const DEFAULT_DOCUMENT = 'index.html'

// This middleware is available only on Cloudflare Workers.
export const serveStatic = (options: ServeStaticOptions = { root: '' }): Handler<string, Env> => {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    // Do nothing if Response is already set
    if (c.res && c.finalized) {
      await next()
    }

    const url = new URL(c.req.url)

    const path = getKVFilePath({
      filename: options.path ?? url.pathname,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    const content = await getContentFromKVAsset(path, {
      manifest: options.manifest,
      namespace: options.namespace ? options.namespace : c.env ? c.env.__STATIC_CONTENT : undefined,
    })
    if (content) {
      const mimeType = getMimeType(path)
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      // Return Response object
      return c.body(content)
    } else {
      console.warn(`Static file: ${path} is not found`)
      await next()
    }
    return
  }
}
