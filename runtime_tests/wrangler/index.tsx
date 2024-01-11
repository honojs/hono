/** @jsxRuntime automatic */
/** @jsxImportSource ../../src/jsx */

import { env } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Wrangler!'))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get('/layout', (c) => {
  c.setRenderer((content) => {
    return c.html(<html>{content}</html>)
  })
  return c.render(<div></div>)
})

export default app
