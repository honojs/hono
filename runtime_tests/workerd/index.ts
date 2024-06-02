import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'

const app = new Hono()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

export default app
