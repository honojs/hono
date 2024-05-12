/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { WebSocketPair } from '@cloudflare/workers-types'
import type { UpgradeWebSocket, WSContext, WSReadyState } from '../../helper/websocket'

// Based on https://github.com/honojs/hono/issues/1153#issuecomment-1767321332
export const upgradeWebSocket: UpgradeWebSocket = (createEvents) => async (c, next) => {
  const CFWebSocketPair = (
    globalThis as unknown as {
      WebSocketPair: typeof WebSocketPair
    }
  ).WebSocketPair

  const events = await createEvents(c)

  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return await next()
  }

  const webSocketPair = new CFWebSocketPair()
  const client = webSocketPair[0]
  const server = webSocketPair[1]

  const wsContext: WSContext = {
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
    server.addEventListener(
      'open',
      (evt) => events.onOpen && events.onOpen(evt as Event, wsContext)
    )
  }
  if (events.onClose) {
    server.addEventListener(
      'close',
      (evt) => events.onClose && events.onClose(evt as CloseEvent, wsContext)
    )
  }
  if (events.onMessage) {
    server.addEventListener(
      'message',
      (evt) => events.onMessage && events.onMessage(evt as MessageEvent, wsContext)
    )
  }
  if (events.onError) {
    server.addEventListener(
      'error',
      (evt) => events.onError && events.onError(evt as ErrorEvent as Event, wsContext)
    )
  }
  server.accept()
  return new Response(null, {
    status: 101,
    // @ts-expect-error Cloudflare Workers API
    webSocket: client,
  })
}
