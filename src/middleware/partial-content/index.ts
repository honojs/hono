import type { MiddlewareHandler } from '../../types'

type Data = string | ArrayBuffer | ReadableStream

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

  return undefined
}

export const partialContent = (): MiddlewareHandler =>
  async function partialContent(c, next) {
    await next()

    const rangeRequest = decodeRangeRequestHeader(c.req.header('Range'))
    const contentLength = c.res.headers.get('Content-Length')

    if (rangeRequest && contentLength && c.res.body) {
      const totalSize = Number(contentLength)
      const offsetSize = totalSize - 1
      const bodyStream = c.res.body.getReader()

      const contents =
        rangeRequest.type === 'ranges'
          ? rangeRequest.ranges
          : [
              {
                start:
                  rangeRequest.type === 'last' ? totalSize - rangeRequest.last : rangeRequest.start,
                end:
                  rangeRequest.type === 'range'
                    ? Math.min(rangeRequest.end ?? offsetSize, offsetSize)
                    : offsetSize,
              },
            ]

      if (contents.length > 10) {
        c.header('Content-Length', totalSize.toString())
        c.res = c.body(null, 416)
        return
      }

      const contentType = c.res.headers.get('Content-Type')

      if (contents.length === 1) {
        const part = contents[0]
        const contentRange = formatRangeSize(part.start, part.end, totalSize)
        c.header('Content-Range', contentRange)
      } else {
        c.header('Content-Type', `multipart/byteranges; boundary=${PARTIAL_CONTENT_BOUNDARY}`)
      }

      const responseBody = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          const { done, value } = await bodyStream.read()

          if (done || !value) {
            controller.close()
            return
          }

          for (const part of contents) {
            const contentRange = formatRangeSize(part.start, part.end, totalSize)
            const sliceStart = part.start
            const sliceEnd = part.end + 1
            const chunk = value.subarray(sliceStart, sliceEnd)

            if (contents.length === 1) {
              controller.enqueue(chunk)
            } else {
              controller.enqueue(
                encoder.encode(
                  `--${PARTIAL_CONTENT_BOUNDARY}\r\nContent-Type: ${contentType}\r\nContent-Range: ${contentRange}\r\n\r\n`
                )
              )
              controller.enqueue(chunk)
              controller.enqueue(encoder.encode('\r\n'))
            }
          }

          if (contents.length !== 1) {
            controller.enqueue(encoder.encode(`--${PARTIAL_CONTENT_BOUNDARY}--\r\n`))
          }

          controller.close()
        },
      })

      c.res = c.body(responseBody, 206)
    }
  }
