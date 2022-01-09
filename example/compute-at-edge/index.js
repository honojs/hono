import { Hono } from 'hono'

const app = new Hono()

app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  next()
})

app.get('/', (c) => c.text('Hono!! Compute@Edge!!'))

app.get('/hello/:name', (c) => {
  return c.text(`Hello ${c.req.params('name')}!!!!!`)
})

app.fire()
