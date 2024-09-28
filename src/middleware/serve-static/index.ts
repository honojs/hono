/**
 * @module
 * Serve Static Middleware for Hono.
 */

import type { Context, Data } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'
import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from '../../utils/compress'
import { getFilePath, getFilePathWithoutDefaultDocument } from '../../utils/filepath'
import { getMimeType, mimes } from '../../utils/mime'

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

const PARTIAL_CONTENT_BOUNDARY = 'PARTIAL_CONTENT_BOUNDARY'

export type PartialContent = { start: number; end: number; data: Data }

const formatRangeSize = (start: number, end: number, size: number | undefined): string => {
  return `bytes ${start}-${end}/${size ?? '*'}`
}

export type RangeRequest =
  | { type: 'range'; start: number; end: number | undefined }
  | { type: 'last'; last: number }
  | { type: 'ranges'; ranges: Array<{ start: number; end: number }> }

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
const decodeRangeRequestHeader = (raw: string | undefined): RangeRequest | undefined => {
  const bytes = raw?.match(/^bytes=(.+)$/)
  if (bytes) {
    const bytesContent = bytes[1].trim()
    const last = bytesContent.match(/^-(\d+)$/)
    if (last) {
      return { type: 'last', last: parseInt(last[1]) }
    }

    const single = bytesContent.match(/^(\d+)-(\d+)?$/)
    if (single) {
      return {
        type: 'range',
        start: parseInt(single[1]),
        end: single[2] ? parseInt(single[2]) : undefined,
      }
    }

    const multiple = bytesContent.match(/^(\d+-\d+(?:,\s*\d+-\d+)+)$/)
    if (multiple) {
      const ranges = multiple[1].split(',').map((range) => {
        const [start, end] = range.split('-').map((n) => parseInt(n.trim()))
        return { start, end }
      })
      return { type: 'ranges', ranges }
    }
  }

  // RFC 9110 https://www.rfc-editor.org/rfc/rfc9110#field.range
  // - An origin server MUST ignore a Range header field that contains a range unit it does not understand.
  // - A server that supports range requests MAY ignore or reject a Range header field that contains an invalid ranges-specifier.
  return undefined
}

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (path: string, c: Context<E>) => Promise<Data | Response | null>
    partialContentSupport?: (path: string) => Promise<{
      size: number
      getPartialContent: (start: number, end: number) => PartialContent
      close: () => void
    }>
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  }
): MiddlewareHandler => {
  let isAbsoluteRoot = false
  let root: string

  if (options.root) {
    if (options.root.startsWith('/')) {
      isAbsoluteRoot = true
      root = new URL(`file://${options.root}`).pathname
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

    // TODO: Cache control for partial contents with If-Range, Date, Cache-Control, ETag, Expires, Content-Location, and Vary.
    const rangeRequest = decodeRangeRequestHeader(c.req.header('Range'))
    if (rangeRequest) {
      if (!options.partialContentSupport) {
        // Fallbacks to getContent since getPartialContents is not provided
      } else {
        let partialContentSupport
        try {
          partialContentSupport = await options.partialContentSupport(path)
        } catch {
          await options.onNotFound?.(path, c)
          await next()
          return
        }

        const { size, getPartialContent, close } = partialContentSupport
        const offsetSize = size - 1
        let contents: Array<PartialContent>
        switch (rangeRequest.type) {
          case 'last':
            contents = [getPartialContent(size - rangeRequest.last, offsetSize)]
            break
          case 'range':
            contents = [
              getPartialContent(
                rangeRequest.start,
                Math.min(rangeRequest.end ?? offsetSize, offsetSize)
              ),
            ]
            break
          case 'ranges':
            if (rangeRequest.ranges.length > 10) {
              c.header('Content-Length', String(size))
              return c.text('', 416)
            }

            contents = rangeRequest.ranges.map((range) =>
              getPartialContent(range.start, Math.min(range.end, offsetSize))
            )
            break
        }
        close()

        const contentLength = contents.reduce((acc, { start, end }) => acc + (end - start + 1), 0)
        c.header('Content-Length', String(contentLength))
        c.header('Accept-Ranges', 'bytes')

        const mimeType = getMimeType(path, options.mimes ?? mimes) ?? 'application/octet-stream'
        let responseBody: Data

        if (contents.length === 1) {
          c.header('Content-Type', mimeType)
          const part = contents[0]
          const contentRange = formatRangeSize(part.start, part.end, size)
          c.header('Content-Range', contentRange)
          responseBody = part.data
        } else {
          c.header('Content-Type', `multipart/byteranges; boundary=${PARTIAL_CONTENT_BOUNDARY}`)
          responseBody = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()
              while (contents.length) {
                const part = contents.shift()!
                const contentRange = formatRangeSize(part.start, part.end, size)
                controller.enqueue(
                  encoder.encode(
                    `--${PARTIAL_CONTENT_BOUNDARY}\r\nContent-Type: ${mimeType}\r\nContent-Range: ${contentRange}\r\n\r\n`
                  )
                )
                if (typeof part.data === 'string') {
                  controller.enqueue(encoder.encode(part.data))
                } else if (part.data instanceof ReadableStream) {
                  const reader = part.data.getReader()
                  const readResult = await reader.read()
                  controller.enqueue(readResult.value)
                } else {
                  controller.enqueue(part.data)
                }
                controller.enqueue(encoder.encode('\r\n'))
              }
              controller.enqueue(encoder.encode(`--${PARTIAL_CONTENT_BOUNDARY}--\r\n`))
              controller.close()
            },
          })
        }

        await options.onFound?.(path, c)
        return c.body(responseBody, 206)
      }
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
