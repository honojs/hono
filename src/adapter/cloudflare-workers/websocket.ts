import type { UpgradeWebSocket, WSContext, WSReadyState } from '../../helper/websocket'

// Based on https://github.com/honojs/hono/issues/1153#issuecomment-1767321332
export const upgradeWebSocket: UpgradeWebSocket<WebSocket> = (createEvents) => async (c, next) => {
  const events = await createEvents(c)

  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return await next()
  }

  // @ts-expect-error WebSocketPair is not typed
  const webSocketPair = new WebSocketPair()
  const client: WebSocket = webSocketPair[0]
  const server: WebSocket = webSocketPair[1]

  const wsContext: WSContext<WebSocket> = {
    binaryType: 'arraybuffer',
    close: (code, reason) => server.close(code, reason),
    get protocol() {
      return server.protocol
    },
    raw: server,
    get readyState() {
      return server.readyState as WSReadyState
    },
    url: server.url ? new URL(server.url) : null,
    send: (source) => server.send(source),
  }
  if (events.onOpen) {
    server.addEventListener('open', (evt: Event) => events.onOpen?.(evt, wsContext))
  }
  if (events.onClose) {
    server.addEventListener('close', (evt: CloseEvent) => events.onClose?.(evt, wsContext))
  }
  if (events.onMessage) {
    server.addEventListener('message', (evt: MessageEvent) => events.onMessage?.(evt, wsContext))
  }
  if (events.onError) {
    server.addEventListener('error', (evt: Event) => events.onError?.(evt, wsContext))
  }

  // @ts-expect-error - server.accept is not typed
  server.accept?.()
  return new Response(null, {
    status: 101,
    // @ts-expect-error - webSocket is not typed
    webSocket: client,
  })
}
