import type { UpgradeWebSocket, WSContext, WSReadyState } from '../../helper/websocket'

export interface UpgradeWebSocketOptions {
  /**
   * Sets the `.protocol` property on the client side web socket to the
   * value provided here, which should be one of the strings specified in the
   * `protocols` parameter when requesting the web socket. This is intended
   * for clients and servers to specify sub-protocols to use to communicate to
   * each other.
   */
  protocol?: string
  /**
   * If the client does not respond to this frame with a
   * `pong` within the timeout specified, the connection is deemed
   * unhealthy and is closed. The `close` and `error` event will be emitted.
   *
   * The unit is seconds, with a default of 30.
   * Set to `0` to disable timeouts.
   */
  idleTimeout?: number
}

export const upgradeWebSocket: UpgradeWebSocket<WebSocket, UpgradeWebSocketOptions> =
  (createEvents, options) => async (c, next) => {
    if (c.req.header('upgrade') !== 'websocket') {
      return await next()
    }

    const events = await createEvents(c)
    const { response, socket } = Deno.upgradeWebSocket(c.req.raw, options || {})

    const wsContext: WSContext<WebSocket> = {
      binaryType: 'arraybuffer',
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
    }
    socket.onopen = (evt) => events.onOpen?.(evt, wsContext)
    socket.onmessage = (evt) => events.onMessage?.(evt, wsContext)
    socket.onclose = (evt) => events.onClose?.(evt, wsContext)
    socket.onerror = (evt) => events.onError?.(evt, wsContext)

    return response
  }
