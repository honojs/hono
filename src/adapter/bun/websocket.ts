import { createWSMessageEvent } from '../../helper/websocket'
import type {
  UpgradeWebSocket,
  WSContext,
  WSEvents,
  WSMessageReceive,
} from '../../helper/websocket'
import { getBunServer } from './server'

interface BunServerWebSocket<T> {
  send(data: string | ArrayBufferLike, compress?: boolean): void
  close(code?: number, reason?: string): void
  data: T
  readyState: 0 | 1 | 2 | 3
}

interface BunWebSocketHandler<T> {
  open(ws: BunServerWebSocket<T>): void
  close(ws: BunServerWebSocket<T>, code?: number, reason?: string): void
  message(ws: BunServerWebSocket<T>, message: string | Uint8Array): void
}
interface CreateWebSocket<T> {
  upgradeWebSocket: UpgradeWebSocket<T>
  websocket: BunWebSocketHandler<BunWebSocketData>
}
export interface BunWebSocketData {
  connId: number
  url: URL
  protocol: string
}

const createWSContext = (ws: BunServerWebSocket<BunWebSocketData>): WSContext => {
  return {
    send: (source, options) => {
      const sendingData =
        typeof source === 'string' ? source : source instanceof Uint8Array ? source.buffer : source
      ws.send(sendingData, options?.compress)
    },
    raw: ws,
    binaryType: 'arraybuffer',
    readyState: ws.readyState,
    url: ws.data.url,
    protocol: ws.data.protocol,
    close(code, reason) {
      ws.close(code, reason)
    },
  }
}

export const createBunWebSocket = <T>(): CreateWebSocket<T> => {
  const websocketConns: WSEvents[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upgradeWebSocket: UpgradeWebSocket<any> = (createEvents) => {
    return async (c, next) => {
      const server = getBunServer(c)
      if (!server) {
        throw new TypeError('env has to include the 2nd argument of fetch.')
      }
      const connId = websocketConns.push(await createEvents(c)) - 1
      const upgradeResult = server.upgrade<BunWebSocketData>(c.req.raw, {
        data: {
          connId,
          url: new URL(c.req.url),
          protocol: c.req.url,
        },
      })
      if (upgradeResult) {
        return new Response(null)
      }
      await next() // Failed
    }
  }
  const websocket: BunWebSocketHandler<BunWebSocketData> = {
    open(ws) {
      const websocketListeners = websocketConns[ws.data.connId]
      if (websocketListeners.onOpen) {
        websocketListeners.onOpen(new Event('open'), createWSContext(ws))
      }
    },
    close(ws, code, reason) {
      const websocketListeners = websocketConns[ws.data.connId]
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
      const websocketListeners = websocketConns[ws.data.connId]
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
