/**
 * An adapter that connects between Hono and moddable
 * @module
 */

// @ts-ignore Runtime API
import { Socket } from 'socket'
import { parseHTTP } from './utils/http-parser'
import { createStreamFromSocket } from './utils/socket-to-webstream'

const encoder = new TextEncoder()

/**
 * A handler passed to TCP Server
 */
export type Handler = (this: { callback: () => void }) => void

/**
 * Create a callback function passed to TCP Server
 * @param app Hono app or an object which has `fetch` method.
 * @param port
 * @returns a handler passed to TCP Server
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle } from 'hono/moddable'
 * import { Listener } from 'socket'
 *
 * const app = new Hono()
 * app.get('/', c => c.text('Hello Hono on moddable!'))
 *
 * const listener = new Listener({ port: 3000 })
 * listener.callback = handle(app)
 * trace('Server is running on http://localhost:3000')
 * ```
 */
export function handle(app: { fetch: (req: Request) => Promise<Response> | Response }): Handler {
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
    const req = new Request(`http://localhost/${rawRequest.path}`, {
      method: rawRequest.method,
      headers: rawRequest.headers,
      body: rawRequest.body,
    })
    const res = await app.fetch(req)
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
