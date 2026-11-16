import type { UpgradeWebSocket, WSEvents, WSMessageReceive } from 'hono/ws'
import { createWSMessageEvent, defineWebSocketHelper, WSContext } from 'hono/ws'
import { getBunServer } from './server'

/**
 * @internal
 */
export interface BunServerWebSocket<T> {
  send(data: string | ArrayBuffer | Uint8Array, compress?: boolean): void
  close(code?: number, reason?: string): void
  data: T
  readyState: 0 | 1 | 2 | 3
}

export interface BunWebSocketHandler<T> {
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

const runHandler = (ws: BunServerWebSocket<BunWebSocketData>, handler: () => unknown): void => {
  const handleError = (error: unknown) => {
    const onError = ws.data.events.onError
    if (!onError) {
      throw error
    }
    const event = new Event('error') as Event & { error: unknown }
    event.error = error
    onError(event, createWSContext(ws))
  }
  try {
    const result = handler()
    if (result instanceof Promise) {
      result.catch(handleError)
    }
  } catch (error) {
    handleError(error)
  }
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

export const upgradeWebSocket: UpgradeWebSocket<any> = defineWebSocketHelper((c, events) => {
  const server = getBunServer<{
    upgrade<T>(
      req: Request,
      options?: {
        data: T
      }
    ): boolean
  }>(c)

  if (!server) {
    throw new TypeError('env has to include the 2nd argument of fetch.')
  }
  const upgradeResult = server.upgrade<BunWebSocketData>(c.req.raw, {
    data: {
      events,
      url: new URL(c.req.url),
      // The first requested subprotocol, exposed via WSContext.protocol to
      // match the deno and cloudflare adapters.
      protocol: c.req.header('sec-websocket-protocol')?.split(',')[0]?.trim() ?? '',
    },
  })
  if (upgradeResult) {
    return new Response(null)
  }
  return // failed
})

export const websocket: BunWebSocketHandler<BunWebSocketData> = {
  open(ws) {
    const websocketListeners = ws.data.events
    if (websocketListeners.onOpen) {
      runHandler(ws, () => websocketListeners.onOpen!(new Event('open'), createWSContext(ws)))
    }
  },
  close(ws, code, reason) {
    const websocketListeners = ws.data.events
    if (websocketListeners.onClose) {
      runHandler(ws, () =>
        websocketListeners.onClose!(
          new CloseEvent('close', {
            code,
            reason,
          }),
          createWSContext(ws)
        )
      )
    }
  },
  message(ws, message) {
    const websocketListeners = ws.data.events
    if (websocketListeners.onMessage) {
      const normalizedReceiveData: WSMessageReceive =
        typeof message === 'string' ? message : message.buffer

      runHandler(ws, () =>
        websocketListeners.onMessage!(
          createWSMessageEvent(normalizedReceiveData),
          createWSContext(ws)
        )
      )
    }
  },
}

/**
 * @deprecated Import `upgradeWebSocket` and `websocket` directly from `@hono/bun` instead.
 * @returns A function to create a Bun WebSocket handler.
 */
export const createBunWebSocket = <T>(): CreateWebSocket<T> => ({
  upgradeWebSocket,
  websocket,
})
