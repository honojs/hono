import type { Context } from '../context.ts'
import type { Next } from '../hono.ts'
import { getFilePath } from '../utils/filepath.ts'
import { getMimeType } from '../utils/mime.ts'

export type ServeStaticOptions = {
  root?: string
  path?: string
}

const DEFAULT_DOCUMENT = 'index.html'

export const serveStatic = (options: ServeStaticOptions = { root: '' }) => {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
    }

    const url = new URL(c.req.url)

    let path = getFilePath({
      filename: options.path ?? url.pathname,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    path = `./${path}`
    const content = await Deno.readFile(path)
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
