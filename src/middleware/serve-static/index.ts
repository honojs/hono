/**
 * @module
 * Serve Static Middleware for Hono.
 */

import type { Context, Data } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'
import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from '../../utils/compress'
import { getMimeType } from '../../utils/mime'
import { defaultJoin } from './path'

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

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (path: string, c: Context<E>) => Promise<Data | Response | null>
    join?: (...paths: string[]) => string
    /**
     * @deprecated Currently, `pathResolve` is no longer used. Please specify `join` instead.
     */
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  }
): MiddlewareHandler => {
  const root = options.root ?? './'
  const optionPath = options.path
  let join = options.join
  if (!join) {
    console.log(
      `Specify the \`join\` option according to the runtime. Example \`import { join } from 'node:path\` In this case, it will fall back to the default join function.`
    )
    join = defaultJoin
  }
  if (options.pathResolve) {
    console.log(`Currently, \`pathResolve\` is no longer used. Please specify \`join\` instead.`)
  }

  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      return next()
    }

    let filename: string

    if (options.path) {
      filename = options.path
    } else {
      try {
        filename = decodeURIComponent(c.req.path)
        if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
          throw new Error()
        }
      } catch {
        await options.onNotFound?.(c.req.path, c)
        return next()
      }
    }

    let path = join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename
    )

    if (options.isDir && (await options.isDir(path))) {
      path = join(path, DEFAULT_DOCUMENT)
    }

    const getContent = options.getContent
    let content = await getContent(path, c)

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
