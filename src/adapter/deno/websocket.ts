import type { UpgradeWebSocket, WSReadyState } from '../../helper/websocket'
import { WSContext, defineWebSocketHelper } from '../../helper/websocket'

export const upgradeWebSocket: UpgradeWebSocket<WebSocket, Deno.UpgradeWebSocketOptions> =
  defineWebSocketHelper(async (c, events, options) => {
    if (c.req.header('upgrade') !== 'websocket') {
      return
    }

    // Echo the negotiated subprotocol back to the client. Browsers (e.g. Chrome)
    // reject the connection when a subprotocol was requested but the response is
    // missing the `Sec-WebSocket-Protocol` header.
    const subprotocol = c.req.header('sec-websocket-protocol')?.split(',')[0]?.trim()

    const { response, socket } = Deno.upgradeWebSocket(c.req.raw, {
      ...(subprotocol ? { protocol: subprotocol } : {}),
      ...options,
    })

    const wsContext: WSContext<WebSocket> = new WSContext({
      close: (code, reason) => socket.close(code, reason),
      get protocol() {
        return socket.protocol
      },
      raw: socket,
      get readyState() {
        return socket.readyState as WSReadyState
      },
      url: socket.url ? new URL(socket.url) : null,
      send: (source) => socket.send(source),
    })
    socket.onopen = (evt) => events.onOpen?.(evt, wsContext)
    socket.onmessage = (evt) => events.onMessage?.(evt, wsContext)
    socket.onclose = (evt) => events.onClose?.(evt, wsContext)
    socket.onerror = (evt) => events.onError?.(evt, wsContext)

    return response
  })
