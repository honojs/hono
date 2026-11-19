import { env, getRuntimeKey } from '../../src/helper/adapter'
import { setCookie } from '../../src/helper/cookie'
import { Hono } from '../../src/hono'
import { getColorEnabledAsync } from '../../src/utils/color'

const app = new Hono()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

app.get('/cookie-dedupe', (c) => {
  c.header('Set-Cookie', 'session=old; Path=/; Expires=Wed, 21 Oct 2015 07:28:00 GMT', {
    append: true,
  })
  c.header('Set-Cookie', 'other=stay; Path=/; HttpOnly', { append: true })
  setCookie(c, 'session', 'new')
  return c.text('Done')
})

app.get('/color', async (c) => {
  return c.text((await getColorEnabledAsync()) ? 'True' : 'False')
})

export default app
