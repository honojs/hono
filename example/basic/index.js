import { Hono, Middleware } from '../../dist'

// or install from npm:
// const { Hono, Middleware } = require('hono')
const app = new Hono()

// Mount Builtin Middleware
app.use('*', Middleware.poweredBy())
app.use('*', Middleware.logger())
app.use(
  '/auth/*',
  Middleware.basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)

// Custom Middleware
// Add Custom Header
app.use('/hello/*', async (c, next) => {
  await next()
  await c.res.headers.append('X-message', 'This is addHeader middleware!')
})

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
app.get('/', (c) => c.text('Hono!!'))
app.get('/hello', () => new Response('This is /hello'))
app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  return new Response(`Your ID is ${id}`)
})
app.get('/auth/*', async (ctx) => ctx.text('You are authorized'))

// Async
app.get('/fetch-url', async () => {
  const response = await fetch('https://example.com/')
  return new Response(`https://example.com/ is ${response.status}`)
})

// Request headers
app.get('/user-agent', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  return new Response(`Your UserAgent is ${userAgent}`)
})

// JSON
app.get('/api/posts', (c) => {
  const posts = [
    { id: 1, title: 'Good Morning' },
    { id: 2, title: 'Good Aternoon' },
    { id: 3, title: 'Good Evening' },
    { id: 4, title: 'Good Night' },
  ]
  return c.json(posts)
})
// status code
app.post('/api/posts', (c) => c.json({ message: 'Created!' }, 201))

// addEventListener
app.fire()
