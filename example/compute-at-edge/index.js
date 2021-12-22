const Hono = require('../../src/hono')
const app = Hono()

app.get('/', () => {
  return new Response('Hono!! Compute@Edge!!')
})

app.fire()
