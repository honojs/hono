/** @jsxRuntime automatic */
/** @jsxImportSource ../../src/jsx */

import { env } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { jsxRenderer } from '../../src/middleware/jsx-renderer'

const app = new Hono()
app.use(
  jsxRenderer(({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
)

app.get('/', (c) => c.text('Hello Wrangler!'))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get('/layout', (c) => {
  return c.render(<div>LAYOUT</div>)
})

export default app
