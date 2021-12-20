const Hono = require('../../src/hono')
const app = Hono()

// Middleware
const logger = (req, _, next) => {
  console.log(`[${req.method}] ${req.url}`)
  next()
}
const addHeader = (_, res, next) => {
  next()
  res.headers.append('X-message', 'This is addHeader middleware!')
}

// Mount middleware
app.use('*', logger)
app.use('/hello', addHeader)

// Routing
app.get('/', () => new Response('Hono!!'))
app.get('/hello', () => new Response('This is /hello'))

// addEventListener
app.fire()
