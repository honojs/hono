import type { Context } from '@/context'
import type { Next } from '@/hono'
import { getContentFromKVAsset, getKVFilePath } from '@/utils/cloudflare'
import { getMimeType } from '@/utils/mime'

type Options = {
  root: string
}

const DEFAULT_DOCUMENT = 'index.html'

// This middleware is available only on Cloudflare Workers.
export const serveStatic = (opt: Options = { root: '' }) => {
  return async (c: Context, next: Next) => {
    await next()
    const url = new URL(c.req.url)

    const path = getKVFilePath({
      filename: url.pathname,
      root: opt.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    const content = await getContentFromKVAsset(path)
    if (content) {
      const mimeType = getMimeType(path)
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      c.res = c.body(content)
    } else {
      // console.debug(`Static file: ${path} is not found`)
    }
  }
}
