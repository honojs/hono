import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { jsx } from '../../src/jsx/jsx-runtime'
import { Suspense, renderToReadableStream } from '../../src/jsx/streaming'
import { getColorEnabledAsync } from '../../src/utils/color'

const app = new Hono()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get('/color', async (c) => {
  return c.text((await getColorEnabledAsync()) ? 'True' : 'False')
})

app.get('/jsx-stream', (c) => {
  const AsyncContent = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return jsx('p', { children: 'Loaded' })
  }

  c.header('Content-Type', 'text/html; charset=UTF-8')
  return c.body(
    renderToReadableStream(
      jsx(Suspense, {
        fallback: jsx('p', { children: 'Loading...' }),
        children: jsx(AsyncContent, {}),
      })
    )
  )
})

export default app
