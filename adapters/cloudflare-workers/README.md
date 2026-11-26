# @hono/cloudflare-workers

Cloudflare Workers adapter for [Hono](https://hono.dev).

```sh
npm i @hono/cloudflare-workers
```

## Migrating from `hono/cloudflare-workers`

The exports are the same. Change the import path:

```diff
- import { serveStatic } from 'hono/cloudflare-workers'
+ import { serveStatic } from '@hono/cloudflare-workers'
```

`hono/cloudflare-workers` is deprecated and will be removed in Hono v5.

## WebSocket Hibernation in Durable Objects

`upgradeWebSocket()` keeps the event handlers in memory, so a Durable Object stays active while a connection is open. With the [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), the Durable Object can sleep between messages. `createHibernationWebSocket()` lets you write the events for each route:

```ts
import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { createHibernationWebSocket } from '@hono/cloudflare-workers'

export class ChatRoom extends DurableObject {
  ws = createHibernationWebSocket(this.ctx)

  app = new Hono().get(
    '/ws',
    this.ws.upgrade(
      {
        onMessage: (event) => {
          for (const socket of this.ctx.getWebSockets('chat')) {
            socket.send(event.data as string)
          }
        },
        onClose: (event, ws) => {
          if (event.code === 1005) {
            ws.close()
          } else {
            ws.close(event.code, event.reason)
          }
        },
      },
      { tags: ['chat'] }
    )
  )

  fetch(request: Request) {
    return this.app.fetch(request)
  }

  webSocketMessage = this.ws.message
  webSocketClose = this.ws.close
}
```

- Set `message`, `close`, and `error` of the helper to `webSocketMessage`, `webSocketClose`, and `webSocketError` of the Durable Object. The helper calls the events of the route that accepted the WebSocket.
- The events cannot use the `Context` of the request, because the Durable Object is created again when it wakes up. Use `tags` to keep data for each connection. `tags` can be a function that takes the `Context`.
- The helper uses one of the 10 tags of a WebSocket to find the events. It finds them by the order of the `upgrade()` calls. Connections can stay open when you deploy new code, so add a new `upgrade()` call after the existing ones.
- Reply to a close in `onClose`. A close without a code arrives as `1005`, and that code cannot be sent back.
- A request without the `Upgrade: websocket` header goes to the next handler.

## License

MIT
