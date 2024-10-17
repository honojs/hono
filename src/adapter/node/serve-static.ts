import type { Context, Env, MiddlewareHandler } from 'hono'
import { getFilePath, getFilePathWithoutDefaultDocument } from 'hono/utils/filepath'
import { getMimeType } from 'hono/utils/mime'
import { createReadStream, lstatSync } from 'fs'
import type { ReadStream, Stats } from 'fs'

export type ServeStaticOptions<E extends Env = Env> = {
  /**
   * Root path, relative to current working directory from which the app was started. Absolute paths are not supported.
   */
  root?: string
  path?: string
  index?: string // default is 'index.html'
  precompressed?: boolean
  rewriteRequestPath?: (path: string) => string
  onFound?: (path: string, c: Context<E>) => void | Promise<void>
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const COMPRESSIBLE_CONTENT_TYPE_REGEX =
  /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i
const ENCODINGS = {
  br: '.br',
  zstd: '.zst',
  gzip: '.gz',
} as const
const ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS) as (keyof typeof ENCODINGS)[]

const createStreamBody = (stream: ReadStream) => {
  const body = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => {
        controller.enqueue(chunk)
      })
      stream.on('end', () => {
        controller.close()
      })
    },

    cancel() {
      stream.destroy()
    },
  })
  return body
}

const addCurrentDirPrefix = (path: string) => {
  return `./${path}`
}

const getStats = (path: string) => {
  let stats: Stats | undefined
  try {
    stats = lstatSync(path)
  } catch {}
  return stats
}

export const serveStatic = (options: ServeStaticOptions = { root: '' }): MiddlewareHandler => {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      return next()
    }

    const filename = options.path ?? decodeURIComponent(c.req.path)

    let path = getFilePathWithoutDefaultDocument({
      filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
      root: options.root,
    })

    if (path) {
      path = addCurrentDirPrefix(path)
    } else {
      return next()
    }

    let stats = getStats(path)

    if (stats && stats.isDirectory()) {
      path = getFilePath({
        filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
        root: options.root,
        defaultDocument: options.index ?? 'index.html',
      })

      if (path) {
        path = addCurrentDirPrefix(path)
      } else {
        return next()
      }

      stats = getStats(path)
    }

    if (!stats) {
      await options.onNotFound?.(path, c)
      return next()
    }
    await options.onFound?.(path, c)

    const mimeType = getMimeType(path)
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
        const precompressedStats = getStats(path + ENCODINGS[encoding])
        if (precompressedStats) {
          c.header('Content-Encoding', encoding)
          c.header('Vary', 'Accept-Encoding', { append: true })
          stats = precompressedStats
          path = path + ENCODINGS[encoding]
          break
        }
      }
    }

    const size = stats.size

    if (c.req.method == 'HEAD' || c.req.method == 'OPTIONS') {
      c.header('Content-Length', size.toString())
      c.status(200)
      return c.body(null)
    }

    const range = c.req.header('range') || ''

    if (!range) {
      c.header('Content-Length', size.toString())
      return c.body(createStreamBody(createReadStream(path)), 200)
    }

    c.header('Accept-Ranges', 'bytes')
    c.header('Date', stats.birthtime.toUTCString())

    const parts = range.replace(/bytes=/, '').split('-', 2)
    const start = parts[0] ? parseInt(parts[0], 10) : 0
    let end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
    if (size < end - start + 1) {
      end = size - 1
    }

    const chunksize = end - start + 1
    const stream = createReadStream(path, { start, end })

    c.header('Content-Length', chunksize.toString())
    c.header('Content-Range', `bytes ${start}-${end}/${stats.size}`)

    return c.body(createStreamBody(stream), 206)
  }
}
