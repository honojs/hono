import { Hono } from 'hono'
import type { WSContext } from 'hono/ws'
import { createHibernationWebSocket, upgradeWebSocket } from '../src/index'
import type { HibernationWebSocket } from '../src/index'

interface RoomState {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getTags(ws: WebSocket): string[]
  getWebSockets(tag?: string): WebSocket[]
}

interface RoomNamespace {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(request: Request): Promise<Response> }
}

const closeWebSocket = (event: CloseEvent, ws: WSContext<WebSocket>) => {
  if (event.code === 1005) {
    ws.close()
  } else {
    ws.close(event.code, event.reason)
  }
}

export class Room {
  ws: HibernationWebSocket
  app: Hono

  constructor(ctx: RoomState) {
    this.ws = createHibernationWebSocket(ctx)
    this.app = new Hono()
      .get(
        '/do/chat',
        this.ws.upgrade(
          {
            onMessage: (event) => {
              for (const socket of ctx.getWebSockets('chat')) {
                socket.send(`chat: ${event.data}`)
              }
            },
            onClose: closeWebSocket,
          },
          { tags: ['chat'] }
        )
      )
      .get(
        '/do/users/:name',
        this.ws.upgrade(
          {
            onMessage: (event, ws) => {
              const tags = ctx.getTags(ws.raw!).filter((tag) => tag.startsWith('user:'))
              ws.send(`${tags}: ${event.data} (${ctx.getWebSockets().length} socket(s))`)
            },
            onClose: closeWebSocket,
          },
          { tags: (c) => [`user:${c.req.param('name')}`] }
        )
      )
  }

  fetch(request: Request) {
    return this.app.fetch(request)
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.ws.message(ws, message)
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    return this.ws.close(ws, code, reason, wasClean)
  }
}

const app = new Hono<{ Bindings: { ROOM: RoomNamespace } }>()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data as string)
    },
  }))
)

app.get('/do/*', (c) => {
  const stub = c.env.ROOM.get(c.env.ROOM.idFromName('room'))
  return stub.fetch(c.req.raw)
})

export default app
