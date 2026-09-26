import { upgradeWebSocket } from '../../src/adapter/cloudflare-workers'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { logger } from '../../src/middleware/logger'
import { getColorEnabled } from '../../src/utils/color'

const app = new Hono<{ Bindings: { NAME?: string; NO_COLOR?: boolean } }>()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get(
  '/ws',
  upgradeWebSocket(() => {
    return {
      onMessage(event, ws) {
        ws.send(event.data as string)
      },
    }
  })
)

app.get('/color', (c) => {
  return c.text(getColorEnabled(c.env) ? 'True' : 'False')
})

app.get(
  '/logger',
  async (c, next) => {
    const messages: string[] = []
    await logger((message) => messages.push(message))(c, next)
    c.res = c.json(messages)
  },
  (c) => c.text('Hello')
)

export default app
