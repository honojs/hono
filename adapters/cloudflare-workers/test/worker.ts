import { Hono } from 'hono'
import { upgradeWebSocket } from '../src/index'

const app = new Hono()

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data as string)
    },
  }))
)

export default app
