import type { Context } from '../../context.ts'
import type { Next } from '../../types.ts'
import { getFilePath } from '../../utils/filepath.ts'
import { getMimeType } from '../../utils/mime.ts'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { open } = Deno

export type ServeStaticOptions = {
  root?: string
  path?: string
  rewriteRequestPath?: (path: string) => string
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
    const filename = options.path ?? decodeURI(url.pathname)
    let path = getFilePath({
      filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) return await next()

    path = `./${path}`

    let file

    try {
      file = await open(path)
    } catch (e) {
      console.warn(`${e}`)
    }

    if (file) {
      const mimeType = getMimeType(path)
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      // Return Response object with stream
      return c.body(file.readable)
    } else {
      console.warn(`Static file: ${path} is not found`)
      await next()
    }
    return
  }
}
