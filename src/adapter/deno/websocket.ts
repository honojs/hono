import type { UpgradeWebSocket, WSContext, WSReadyState } from '../../helper/websocket'

export const upgradeWebSocket: UpgradeWebSocket = (createEvents) => async (c, next) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return await next()
  }
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw)

  const events = await createEvents(c)

  const wsContext: WSContext = {
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
  socket.onopen = (evt) => events.onOpen && events.onOpen(evt, wsContext)
  socket.onmessage = (evt) => events.onMessage && events.onMessage(evt, wsContext)
  socket.onclose = (evt) => events.onClose && events.onClose(evt, wsContext)
  socket.onerror = (evt) => events.onError && events.onError(evt, wsContext)

  return response
}
