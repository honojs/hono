import type { UpgradeWebSocket, WSMessageReceive, WSReadyState } from '../../helper/websocket'
import { createWSMessageEvent, defineWebSocketHelper, WSContext } from '../../helper/websocket'
import { getAntServer } from './server'

/**
 * Options of Ant's `server.upgradeWebSocket()`
 */
export interface AntUpgradeWebSocketOptions {
  /**
   * Sets the subprotocol of the connection. It must be one of the values the
   * client sent in the `Sec-WebSocket-Protocol` header, otherwise Ant rejects
   * the upgrade.
   */
  protocol?: string
}

interface AntServer {
  upgradeWebSocket(
    req: Request,
    options?: AntUpgradeWebSocketOptions
  ): { response: Response; socket: WebSocket }
}

// Ant delivers binary frames as Uint8Array. Hand an ArrayBuffer to the
// listeners to match the bun and deno adapters.
const normalizeReceiveData = (data: unknown): WSMessageReceive => {
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  return data as WSMessageReceive
}

/**
 * @internal
 */
export const createWSContext = (socket: WebSocket, url: URL): WSContext<WebSocket> =>
  new WSContext({
    close: (code, reason) => socket.close(code, reason),
    get protocol() {
      return socket.protocol
    },
    raw: socket,
    get readyState() {
      return socket.readyState as WSReadyState
    },
    url,
    send: (source) => socket.send(source),
  })

export const upgradeWebSocket: UpgradeWebSocket<WebSocket, AntUpgradeWebSocketOptions> =
  defineWebSocketHelper((c, events, options) => {
    if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
      return
    }

    const server = getAntServer<AntServer>(c)
    if (!server || typeof server.upgradeWebSocket !== 'function') {
      throw new TypeError('env has to include the 2nd argument of fetch.')
    }

    // Echo the negotiated subprotocol back to the client. Browsers (e.g. Chrome)
    // reject the connection when a subprotocol was requested but the response is
    // missing the `Sec-WebSocket-Protocol` header.
    const subprotocol = c.req.header('sec-websocket-protocol')?.split(',')[0]?.trim()

    const { response, socket } = server.upgradeWebSocket(c.req.raw, {
      ...(subprotocol ? { protocol: subprotocol } : {}),
      ...options,
    })

    // The server-side socket has no URL of its own, so use the request URL.
    const wsContext = createWSContext(socket, new URL(c.req.url))
    socket.addEventListener('open', (evt) => events.onOpen?.(evt, wsContext))
    socket.addEventListener('message', (evt) => {
      events.onMessage?.(createWSMessageEvent(normalizeReceiveData(evt.data)), wsContext)
    })
    socket.addEventListener('close', (evt) => events.onClose?.(evt, wsContext))
    socket.addEventListener('error', (evt) => events.onError?.(evt, wsContext))

    return response
  })
