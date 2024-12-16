import { upgradeWebSocket } from '../../src/adapter/cloudflare-workers'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { getColorEnabled } from '../../src/utils/color'

interface Env {
  NO_COLOR: boolean
  NAME: string
}

const app = new Hono<{
  Bindings: Env
}>()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
  const { NAME } = env(c)
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
  c.env.NO_COLOR = true
  return c.json({
    colorEnabled: getColorEnabled(c),
  })
})

export default app
