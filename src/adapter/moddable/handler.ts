/**
 * An adapter that connects between Hono and moddable
 * @module
 */

import { parseHTTP } from './utils/http-parser'
import { createStreamFromSocket } from './utils/socket-to-webstream'

const encoder = new TextEncoder()

/**
 * A handler passed to TCP Server
 */
export type Handler = (this: { callback: () => void }) => void

export interface SocketInit {
  listener: { callback: Handler }
}
export interface Socket {
  callback: (
    this: {
      read(type: typeof ArrayBuffer): ArrayBuffer
    },
    message: number,
    value?: unknown
  ) => void
  write(chunk: ArrayBuffer): void
  close(): void
}
export interface SocketConstructor {
  new (opts: SocketInit): Socket
}

export type HandleFunction = (app: {
  fetch: (req: Request, env: unknown) => Promise<Response> | Response
}) => Handler

export function createHandleFunction(Socket: SocketConstructor): HandleFunction {
  return function handle(app: {
    fetch: (req: Request, env: unknown) => Promise<Response> | Response
  }): Handler {
    return async function callback() {
      const socket = new Socket({ listener: this })
      const { readable, writable } = createStreamFromSocket(socket)
      // parse the request
      const rawRequest = await parseHTTP(readable)
      if (!rawRequest) {
        socket.close()
        return
      }
      // create request
      const req = new Request(`http://localhost${rawRequest.path}`, {
        method: rawRequest.method,
        headers: rawRequest.headers,
        body: rawRequest.body,
      })
      const res = await app.fetch(req, {
        socket,
      })
      // send response
      const writer = writable.getWriter()
      writer.write(encoder.encode(`HTTP/1.1 ${res.status} ${res.statusText}\r\n`))
      res.headers.forEach((v, k) => {
        writer.write(encoder.encode(`${k}: ${v}\r\n`))
      })
      writer.write(encoder.encode('\r\n'))
      if (res.body) {
        const reader = res.body.getReader()
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) {
            break
          }
          writer.write(chunk.value)
        }
      }
      await writer.close()
    }
  }
}
