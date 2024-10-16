/**
 * @module
 * Serve Static Middleware for Hono.
 */

import type { Context, Data } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'
import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from '../../utils/compress'
import { getFilePath, getFilePathWithoutDefaultDocument } from '../../utils/filepath'
import { getMimeType } from '../../utils/mime'

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  precompressed?: boolean
  mimes?: Record<string, string>
  rewriteRequestPath?: (path: string) => string
  onFound?: (path: string, c: Context<E>) => void | Promise<void>
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const ENCODINGS = {
  br: '.br',
  zstd: '.zst',
  gzip: '.gz',
} as const
const ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS) as (keyof typeof ENCODINGS)[]

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path

const isAbsolutePath = (path: string) => {
  const isUnixAbsolutePath = path.startsWith('/')
  const hasDriveLetter = /^[a-zA-Z]:\\/.test(path)
  const isUncPath = /^\\\\[^\\]+\\[^\\]+/.test(path)
  return isUnixAbsolutePath || hasDriveLetter || isUncPath
}

const windowsPathToUnixPath = (path: string) => {
  return path.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/')
}

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (path: string, c: Context<E>) => Promise<Data | Response | null>
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  }
): MiddlewareHandler => {
  let isAbsoluteRoot = false
  let root: string

  if (options.root) {
    if (isAbsolutePath(options.root)) {
      isAbsoluteRoot = true
      root = windowsPathToUnixPath(options.root)
      root = new URL(`file://${root}`).pathname
    } else {
      root = options.root
    }
  }

  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }

    let filename = options.path ?? decodeURI(c.req.path)
    filename = options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename

    // If it was Directory, force `/` on the end.
    if (!filename.endsWith('/') && options.isDir) {
      const path = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (path && (await options.isDir(path))) {
        filename += '/'
      }
    }

    let path = getFilePath({
      filename,
      root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) {
      return await next()
    }

    if (isAbsoluteRoot) {
      path = '/' + path
    }

    const getContent = options.getContent
    const pathResolve = options.pathResolve ?? defaultPathResolve
    path = pathResolve(path)
    let content = await getContent(path, c)

    if (!content) {
      let pathWithoutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (!pathWithoutDefaultDocument) {
        return await next()
      }
      pathWithoutDefaultDocument = pathResolve(pathWithoutDefaultDocument)

      if (pathWithoutDefaultDocument !== path) {
        content = await getContent(pathWithoutDefaultDocument, c)
        if (content) {
          path = pathWithoutDefaultDocument
        }
      }
    }

    if (content instanceof Response) {
      return c.newResponse(content.body, content)
    }

    if (content) {
      const mimeType = (options.mimes && getMimeType(path, options.mimes)) || getMimeType(path)
      c.header('Content-Type', mimeType || 'application/octet-stream')

      if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
        const acceptEncodingSet = new Set(
          c.req
            .header('Accept-Encoding')
            ?.split(',')
            .map((encoding) => encoding.trim())
        )

        for (const encoding of ENCODINGS_ORDERED_KEYS) {
          if (!acceptEncodingSet.has(encoding)) {
            continue
          }
          const compressedContent = (await getContent(path + ENCODINGS[encoding], c)) as Data | null

          if (compressedContent) {
            content = compressedContent
            c.header('Content-Encoding', encoding)
            c.header('Vary', 'Accept-Encoding', { append: true })
            break
          }
        }
      }
      await options.onFound?.(path, c)
      return c.body(content)
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
}
