import { Hono, Middleware } from '../../dist'
// or install from npm:
// import { Hono, Middleware } from 'hono'

const app = new Hono()

// Mount Builtin Middleware
app.use('*', Middleware.poweredBy())
app.use('*', Middleware.logger())
app.use('/form', Middleware.bodyParse())
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

// Handle error
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (err) {
    console.error(`${err}`)
    c.res = new Response('Custom Error Message', { status: 500 })
  }
})

// Routing
app.get('/', (c) => c.text('Hono!!'))
// Use Response object directly
app.get('/hello', () => new Response('This is /hello'))

// Named parameter
app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  return c.text(`Your ID is ${id}`)
})
// Redirect
app.get('/redirect', (c) => c.redirect('/'))
// Authentication required
app.get('/auth/*', (c) => c.text('You are authorized'))

// Async
app.get('/fetch-url', async (c) => {
  const response = await fetch('https://example.com/')
  return c.text(`https://example.com/ is ${response.status}`)
})

// Request headers
app.get('/user-agent', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  return c.text(`Your UserAgent is ${userAgent}`)
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

app.post('/form', async (ctx) => {
  return ctx.json(ctx.req.parsedBody || {})
  //return new Response('ok /form')
})

// Throw Error
app.get('/error', () => {
  throw Error('Error has occurred')
})

// addEventListener
app.fire()
