import type { UpgradeWebSocket, WSEvents, WSMessageReceive } from '../../helper/websocket'
import { createWSMessageEvent, defineWebSocketHelper, WSContext } from '../../helper/websocket'
import { getBunServer } from './server'

/**
 * @internal
 */
export interface BunServerWebSocket<T> {
  send(data: string | ArrayBufferLike, compress?: boolean): void
  close(code?: number, reason?: string): void
  data: T
  readyState: 0 | 1 | 2 | 3
}

interface BunWebSocketHandler<T> {
  open(ws: BunServerWebSocket<T>): void
  close(ws: BunServerWebSocket<T>, code?: number, reason?: string): void
  message(ws: BunServerWebSocket<T>, message: string | { buffer: ArrayBufferLike }): void
}
interface CreateWebSocket<T> {
  upgradeWebSocket: UpgradeWebSocket<T>
  websocket: BunWebSocketHandler<BunWebSocketData>
}
export interface BunWebSocketData {
  events: WSEvents
  url: URL
  protocol: string
}

/**
 * @internal
 */
export const createWSContext = (ws: BunServerWebSocket<BunWebSocketData>): WSContext => {
  return new WSContext({
    send: (source, options) => {
      ws.send(source, options?.compress)
    },
    raw: ws,
    readyState: ws.readyState,
    url: ws.data.url,
    protocol: ws.data.protocol,
    close(code, reason) {
      ws.close(code, reason)
    },
  })
}

export const createBunWebSocket = <T>(): CreateWebSocket<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upgradeWebSocket: UpgradeWebSocket<any> = defineWebSocketHelper((c, events) => {
    const server = getBunServer(c)
    if (!server) {
      throw new TypeError('env has to include the 2nd argument of fetch.')
    }
    const upgradeResult = server.upgrade<BunWebSocketData>(c.req.raw, {
      data: {
        events,
        url: new URL(c.req.url),
        protocol: c.req.url,
      },
    })
    if (upgradeResult) {
      return new Response(null)
    }
    return // failed
  })
  const websocket: BunWebSocketHandler<BunWebSocketData> = {
    open(ws) {
      const websocketListeners = ws.data.events
      if (websocketListeners.onOpen) {
        websocketListeners.onOpen(new Event('open'), createWSContext(ws))
      }
    },
    close(ws, code, reason) {
      const websocketListeners = ws.data.events
      if (websocketListeners.onClose) {
        websocketListeners.onClose(
          new CloseEvent('close', {
            code,
            reason,
          }),
          createWSContext(ws)
        )
      }
    },
    message(ws, message) {
      const websocketListeners = ws.data.events
      if (websocketListeners.onMessage) {
        const normalizedReceiveData =
          typeof message === 'string' ? message : (message.buffer satisfies WSMessageReceive)

        websocketListeners.onMessage(
          createWSMessageEvent(normalizedReceiveData),
          createWSContext(ws)
        )
      }
    },
  }
  return {
    upgradeWebSocket,
    websocket,
  }
}
