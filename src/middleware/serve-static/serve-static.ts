import type { Context } from '../../context'
import type { Handler, Next } from '../../hono'
import { getContentFromKVAsset, getKVFilePath } from '../../utils/cloudflare'
import { getMimeType } from '../../utils/mime'

export type ServeStaticOptions = {
  root: string
  manifest?: object | string
  namespace?: KVNamespace
}

const DEFAULT_DOCUMENT = 'index.html'

// This middleware is available only on Cloudflare Workers.
export const serveStatic = (options: ServeStaticOptions = { root: '' }): Handler => {
  return async (c: Context, next: Next): Promise<Response | null> => {
    // Do nothing if Response is already set
    if (c.res) {
      await next()
    }

    const url = new URL(c.req.url)

    const path = getKVFilePath({
      filename: url.pathname,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    const content = await getContentFromKVAsset(path, {
      manifest: options.manifest,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    return null
  }
}
