import { upgradeWebSocket } from '../../src/adapter/cloudflare-workers'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { getColorEnabledAsync } from '../../src/utils/color'

const app = new Hono()

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

app.get('/color', async (c) => {
  return c.text((await getColorEnabledAsync()) ? 'True' : 'False')
})

export default app
