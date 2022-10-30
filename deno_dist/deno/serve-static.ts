import type { Context } from '../context.ts'
import type { Next } from '../types.ts'
import { getFilePath } from '../utils/filepath.ts'
import { getMimeType } from '../utils/mime.ts'

export type ServeStaticOptions = {
  root?: string
  path?: string
}

const DEFAULT_DOCUMENT = 'index.html'

export const serveStatic = (options: ServeStaticOptions = { root: '' }) => {
  return async (c: Context, next: Next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }

    const url = new URL(c.req.url)

    let path = getFilePath({
      filename: options.path ?? url.pathname,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    path = `./${path}`

    let content

    try {
      content = await Deno.readFile(path)
    } catch (e) {
      console.warn(`${e}`)
    }

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
