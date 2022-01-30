import type { Context } from '../../context'
import { getContentFromKVAsset } from '../../utils/cloudflare'
import { getMimeType } from '../../utils/mime'

type Options = {
  root: string
}

const DEFAULT_DOCUMENT = 'index.html'

// This middleware is available only on Cloudflare Workers.
export const serveStatic = (opt: Options = { root: '' }) => {
  return async (c: Context, next: Function) => {
    await next()
    const url = new URL(c.req.url)

    const path = getKVPath(url.pathname, opt.root)

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

const getKVPath = (filename: string, root: string): string => {
  if (filename.endsWith('/')) {
    // /top/ => /top/index.html
    filename = filename.concat(DEFAULT_DOCUMENT)
  } else if (!getMimeType(filename)) {
    // /top => /top/index.html
    filename = filename.concat('/' + DEFAULT_DOCUMENT)
  }
  // /foo.html => foo.html
  filename = filename.replace(/^\//, '')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root + '/' + filename
  path = path.replace(/^\.?\//, '')

  return path
}
