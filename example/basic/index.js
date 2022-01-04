const { Hono, Middleware } = require('../../src/hono')
const app = new Hono()

// Mount Builtin Middleware
app.use('*', Middleware.poweredBy)
app.use('*', Middleware.logger())

// Custom Middleware
// Add Custom Header
const addHeader = async (c, next) => {
  await next()
  await c.res.headers.append('X-message', 'This is addHeader middleware!')
}
app.use('/hello/*', addHeader)

// Log response time
app.use('*', async (c, next) => {
  await next()
  const responseTime = await c.res.headers.get('X-Response-Time')
  console.log(`X-Response-Time: ${responseTime}`)
})

// Add X-Response-Time header
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  await c.res.headers.append('X-Response-Time', `${ms}ms`)
})

// Routing
app.get('/', () => 'Hono!!')
app.get('/hello', () => new Response('This is /hello'))
app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  return new Response(`Your ID is ${id}`)
})

// Async
app.get('/fetch-url', async () => {
  const response = await fetch('https://example.com/')
  return new Response(`https://example.com/ is ${response.status}`)
})

app.get('/user-agent', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  return new Response(`Your UserAgent is ${userAgent}`)
})

// addEventListener
app.fire()
