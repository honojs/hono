/** @jsxRuntime automatic @jsxImportSource ../../src/jsx */
import { Hono } from '../../src/hono'

const app = new Hono()
app.get('/', (c) =>
  c.html(
    <html>
      <body>Hono!</body>
    </html>
  )
)

export default app

export const shouldNotBeIncluded = ['/jsx/dom/']
