import type { Context, MiddlewareHandler } from 'hono'
import { WSContext, createWSMessageEvent, defineWebSocketHelper } from 'hono/ws'
import type { UpgradeWebSocket, WSEvents, WSReadyState } from 'hono/ws'

const createWSContext = (ws: WebSocket): WSContext<WebSocket> =>
  new WSContext<WebSocket>({
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

  const wsContext = createWSContext(server)

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

type HibernationWebSocketEvents = Omit<WSEvents<WebSocket>, 'onOpen'>

interface HibernationWebSocketState {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getTags(ws: WebSocket): string[]
}

export interface HibernationWebSocketOptions {
  /** Tags for the WebSocket, to find it later with `ctx.getWebSockets(tag)` */
  tags?: string[] | ((c: Context) => string[])
}

export interface HibernationWebSocket {
  upgrade(
    events: HibernationWebSocketEvents,
    options?: HibernationWebSocketOptions
  ): MiddlewareHandler
  message(ws: WebSocket, message: string | ArrayBuffer): void
  close(ws: WebSocket, code: number, reason: string, wasClean: boolean): void
  error(ws: WebSocket, error: unknown): void
}

const EVENTS_TAG_PREFIX = 'hono:'

/**
 * Create a WebSocket helper for a Durable Object with the Hibernation API.
 * The Durable Object can hibernate while the connections stay open.
 *
 * @param state - The state of the Durable Object (`this.ctx`)
 *
 * @example
 * ```ts
 * import { DurableObject } from 'cloudflare:workers'
 * import { Hono } from 'hono'
 * import { createHibernationWebSocket } from '@hono/cloudflare-workers'
 *
 * export class ChatRoom extends DurableObject {
 *   ws = createHibernationWebSocket(this.ctx)
 *
 *   app = new Hono().get(
 *     '/ws',
 *     this.ws.upgrade({
 *       onMessage: (event, ws) => {
 *         ws.send(`Echo: ${event.data}`)
 *       },
 *     })
 *   )
 *
 *   fetch(request: Request) {
 *     return this.app.fetch(request)
 *   }
 *
 *   webSocketMessage = this.ws.message
 * }
 * ```
 */
export const createHibernationWebSocket = (
  state: HibernationWebSocketState
): HibernationWebSocket => {
  // The Durable Object registers the same events in the same order after it wakes up,
  // so the index in the tag finds the events of the route that accepted the WebSocket.
  const eventsList: HibernationWebSocketEvents[] = []

  const findEvents = (ws: WebSocket): HibernationWebSocketEvents | undefined => {
    const tag = state.getTags(ws).find((tag) => tag.startsWith(EVENTS_TAG_PREFIX))
    return tag ? eventsList[Number(tag.slice(EVENTS_TAG_PREFIX.length))] : undefined
  }

  return {
    upgrade(events, options) {
      const eventsTag = `${EVENTS_TAG_PREFIX}${eventsList.push(events) - 1}`

      return async (c, next) => {
        if (c.req.header('Upgrade') !== 'websocket') {
          return next()
        }

        // @ts-expect-error WebSocketPair is not typed
        const webSocketPair = new WebSocketPair()
        const client: WebSocket = webSocketPair[0]
        const server: WebSocket = webSocketPair[1]

        const tags = typeof options?.tags === 'function' ? options.tags(c) : options?.tags
        state.acceptWebSocket(server, [eventsTag, ...(tags ?? [])])

        return new Response(null, {
          status: 101,
          // @ts-expect-error - webSocket is not typed
          webSocket: client,
        })
      }
    },
    message(ws, message) {
      return findEvents(ws)?.onMessage?.(createWSMessageEvent(message), createWSContext(ws))
    },
    close(ws, code, reason, wasClean) {
      return findEvents(ws)?.onClose?.(
        new CloseEvent('close', { code, reason, wasClean }),
        createWSContext(ws)
      )
    },
    error(ws, error) {
      const event = new Event('error') as Event & { error: unknown }
      event.error = error
      return findEvents(ws)?.onError?.(event, createWSContext(ws))
    },
  }
}
