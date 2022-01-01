const { Hono, Middleware } = require('hono')
const app = new Hono()

// Custom Middleware
const logger = (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  next()
}
const addHeader = (c, next) => {
  next()
  c.res.headers.append('X-message', 'This is addHeader middleware!')
}

// Mount Builtin Middleware
app.use('*', Middleware.poweredBy)

// Mount Custom middleware
app.use('*', logger)
app.use('/hello/*', addHeader)

// Routing
app.get('/', () => new Response('Hono!!'))
app.get('/hello', () => new Response('This is /hello'))

app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  return new Response(`Your ID is ${id}`)
})

// addEventListener
app.fire()
