const Hono = require('../../src/hono')
const app = Hono()

// Text
app.get('/', () => 'Hono!!')

// JSON
app.get('/api', () => { return { message: 'Hello! from /api' } })

// With original response header
app.get('/hello', () => {
  return new Response('Hello! from /hello', {
    status: 200,
    headers: {
      'X-Message': 'This is Hono'
    }
  })
})

app.fire()