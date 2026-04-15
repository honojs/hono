import { WSContext, defineWebSocketHelper } from '../../helper/websocket'
import type { UpgradeWebSocket, WSEvents, WSReadyState } from '../../helper/websocket'

// Based on https://github.com/honojs/hono/issues/1153#issuecomment-1767321332
export const upgradeWebSocket: UpgradeWebSocket<
  WebSocket,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  Omit<WSEvents<WebSocket>, 'onOpen'>
> = defineWebSocketHelper(async (c, events) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return
  }

  // @ts-expect-error WebSocketPair is not typed
  const webSocketPair = new WebSocketPair()
  const client: WebSocket = webSocketPair[0]
  const server: WebSocket = webSocketPair[1]

  const wsContext = new WSContext<WebSocket>({
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
  })

  // note: cloudflare workers doesn't support 'open' event

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
})

/**
 * Create a WSContext from a raw Cloudflare WebSocket.
 * Use in Durable Object Hibernation API handlers.
 *
 * @example
 * ```ts
 * import { createWSContext } from 'hono/cloudflare-workers'
 *
 * export class ChatRoom extends DurableObject {
 *   webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
 *     const wsCtx = createWSContext(ws)
 *     wsCtx.send(`Echo: ${message}`)
 *   }
 * }
 * ```
 */
export const createWSContext = (ws: WebSocket): WSContext<WebSocket> => {
  return new WSContext<WebSocket>({
    close: (code, reason) => ws.close(code, reason),
    get protocol() {
      return ws.protocol
    },
    raw: ws,
    get readyState() {
      return ws.readyState as WSReadyState
    },
    url: ws.url ? new URL(ws.url) : null,
    send: (source) => ws.send(source),
  })
}

/**
 * Options for upgradeWebSocketForDO
 */
export interface UpgradeWebSocketForDOOptions {
  /** Optional tags for the WebSocket (used with getWebSockets(tag)) */
  tags?: string[]
}

/**
 * Upgrade WebSocket in a Durable Object using Hibernation API.
 * Handles WebSocketPair creation and acceptWebSocket.
 *
 * @param ctx - The Durable Object's state context (this.ctx)
 * @param options - Optional configuration (tags)
 * @returns Response with status 101 and the client WebSocket attached
 *
 * @example
 * ```ts
 * import { upgradeWebSocketForDO } from 'hono/cloudflare-workers'
 *
 * export class ChatRoom extends DurableObject {
 *   app = new Hono()
 *
 *   constructor(ctx: DurableObjectState, env: Env) {
 *     super(ctx, env)
 *     this.app.get('/ws', (c) => upgradeWebSocketForDO(this.ctx))
 *   }
 *
 *   fetch(request: Request) {
 *     return this.app.fetch(request)
 *   }
 * }
 * ```
 */
export const upgradeWebSocketForDO = (
  ctx: { acceptWebSocket(ws: WebSocket, tags?: string[]): void },
  options?: UpgradeWebSocketForDOOptions
): Response => {
  // @ts-expect-error WebSocketPair is not typed
  const webSocketPair = new WebSocketPair()
  const client: WebSocket = webSocketPair[0]
  const server: WebSocket = webSocketPair[1]

  ctx.acceptWebSocket(server, options?.tags)

  return new Response(null, {
    status: 101,
    // @ts-expect-error webSocket is not typed
    webSocket: client,
  })
}
