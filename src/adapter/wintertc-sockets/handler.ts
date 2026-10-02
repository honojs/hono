import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import {
  BufferedReader,
  HttpParseError,
  buildRequestUrl,
  createBodyDecoder,
  hasConnectionOption,
  parseRequestHead,
  writeContinue,
  writeErrorResponse,
  writeResponse,
} from './http'
import type { ServeSocketOptions, SocketBindings, SocketInfo, WinterTCSocket } from './types'

const DEFAULT_MAX_HEADER_SIZE = 16 * 1024

/**
 * Serves HTTP/1.1 requests read from an accepted WinterTC socket with a Hono app,
 * until the connection is closed by either side.
 *
 * The socket and its `SocketInfo` are available as `c.env.socket` and `c.env.info`.
 *
 * @param app - The Hono application instance
 * @param socket - A connected socket
 * @param options - Options for serving the socket
 * @returns A promise that resolves once the socket is closed
 */
export const serveSocket = async <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  socket: WinterTCSocket,
  options: ServeSocketOptions = {}
): Promise<void> => {
  const {
    scheme = 'http',
    maxHeaderSize = DEFAULT_MAX_HEADER_SIZE,
    keepAlive: allowKeepAlive = true,
  } = options

  let info: SocketInfo | undefined
  try {
    info = await socket.opened
  } catch {
    return
  }
  const env: SocketBindings = { ...options.env, socket, info }

  const reader = new BufferedReader(socket.readable)
  const writer = socket.writable.getWriter()
  try {
    for (;;) {
      let head
      try {
        const rawHead = await reader.readHead(maxHeaderSize)
        if (!rawHead) {
          break
        }
        head = parseRequestHead(rawHead)
      } catch (e) {
        if (e instanceof HttpParseError) {
          await writeErrorResponse(writer, e.status)
        }
        break
      }

      const { method, minorVersion, headers } = head
      let keepAlive =
        allowKeepAlive &&
        (minorVersion === 1
          ? !hasConnectionOption(headers, 'close')
          : hasConnectionOption(headers, 'keep-alive'))

      let request: Request
      let decoder
      let expectContinue = false
      let continueSent = false
      let responseStarted = false
      let bodyFailed = false
      try {
        const url = buildRequestUrl(head, scheme)
        decoder = createBodyDecoder(reader, headers, maxHeaderSize)
        expectContinue =
          minorVersion === 1 &&
          decoder !== null &&
          headers.get('expect')?.toLowerCase() === '100-continue'

        let body: ReadableStream<Uint8Array> | null = null
        // a body sent with GET or HEAD is consumed but not exposed, since `Request` does not allow it
        if (decoder && method !== 'GET' && method !== 'HEAD') {
          const bodyDecoder = decoder
          body = new ReadableStream(
            {
              async pull(controller) {
                if (expectContinue && !continueSent && !responseStarted) {
                  continueSent = true
                  await writeContinue(writer)
                }
                let chunk
                try {
                  chunk = await bodyDecoder.next()
                } catch (e) {
                  bodyFailed = true
                  throw e
                }
                if (chunk) {
                  controller.enqueue(chunk)
                } else {
                  controller.close()
                }
              },
            },
            // read only on demand, so `100 Continue` is sent only if the app reads the body
            { highWaterMark: 0 }
          )
        }
        request = new Request(url, {
          method,
          headers,
          body,
          // @ts-expect-error `duplex` is required to send a stream body but is missing in some lib types
          duplex: 'half',
        })
      } catch (e) {
        await writeErrorResponse(writer, e instanceof HttpParseError ? e.status : 400)
        break
      }

      let res: Response
      try {
        res = await app.fetch(request, env)
      } catch {
        await writeErrorResponse(writer, 500)
        break
      }

      responseStarted = true
      keepAlive = await writeResponse(writer, res, { method, minorVersion, keepAlive })

      if (decoder && !decoder.done) {
        if (!keepAlive || bodyFailed || (expectContinue && !continueSent)) {
          // the client may still be waiting for `100 Continue` before sending the body
          break
        }
        try {
          // skip the unread body to reach the next request
          while (await decoder.next()) {
            // continue
          }
        } catch {
          break
        }
      }
      if (!keepAlive) {
        break
      }
    }
  } catch {
    // the connection was reset or the response body errored
  } finally {
    reader.release()
    await writer.close().catch(() => {})
    try {
      await socket.close()
    } catch {
      // already closed
    }
  }
}

/**
 * Creates a function that serves each socket it is given with a Hono app.
 * Pass it to the accept loop of the runtime.
 *
 * @param app - The Hono application instance
 * @param options - Options for serving each socket
 */
export const createSocketHandler = <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  options?: ServeSocketOptions
): ((socket: WinterTCSocket) => Promise<void>) => {
  return (socket) => serveSocket(app, socket, options)
}
