/**
 * @module
 * WebSocket Proxy Helper for Hono.
 */

import { hc } from '../../client'
import type { WSEvents } from '../websocket'

interface ProxyWebsocketFetch {
  (input: string | URL | Request): Promise<WSEvents>
}

/**
 * A helper for proxying WebSockets.
 *
 * @example
 * ```ts
 * app.get(
 *   '/ws',
 *   upgradeWebSocket(() => {
 *     return proxyWebsocket('ws://example.com/')
 *   })
 * )
 * ```
 */
export const proxyWebsocket: ProxyWebsocketFetch = async (input) => {
  const request = new Request(input)
  const url = new URL(request.url)
  let upstream: WebSocket

  return {
    async onOpen(_event, context) {
      const client = hc(url.origin)
      upstream = client[url.pathname].$ws(0)

      upstream.addEventListener('message', (event) => {
        if (context.readyState === WebSocket.OPEN) {
          context.send(event.data.toString())
        }
      })

      upstream.addEventListener('close', () => {
        context.close()
      })

      upstream.addEventListener('error', (err) => {
        console.error('Upstream WebSocket error:', err)
        context.close()
      })
    },
    onMessage(event, _context) {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(event.data.toString())
      }
    },
    onClose() {
      upstream?.close()
    },
  }
}
