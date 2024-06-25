import { upgradeWebSocket } from '../../src/adapter/cloudflare-workers'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { stream } from '../../src/helper/streaming'
import { Hono } from '../../src/hono'

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

let abortCount = 0

app.get('/stream', (c) => {
  return stream(c, async (w) => {
    w.onAbort(() => {
      abortCount++
    })

    await w.writeln('Hello1')
    await w.writeln('Hello2')
    await w.writeln('Hello3')
  })
})

app.get('/check-abort', (c) => {
  return c.json({ abortCount })
})

export default app
