import { Hono } from '../../dist/hono'
import { basicAuth } from '../../dist/middleware/basic-auth/basic-auth'

const app = new Hono()

app.use('/auth/*', basicAuth({ username: 'hono', password: 'acoolproject' }))

app.get('/', (c) => c.text('Hono!! Compute@Edge!!'))
app.get('/auth/*', (c) => c.text('Your authorized!'))

app.get('/hello/:name', (c) => {
  return c.text(`Hello ${c.req.param('name')}!!!!!`)
})

app.fire()
