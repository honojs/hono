import { Hono } from '../../dist'
import { poweredBy } from '../../src/middleware/powered-by/powered-by'
import { logger } from '../../src/middleware/logger/logger'
import { bodyParse } from '../../src/middleware/body-parse/body-parse'
import { basicAuth } from '../../src/middleware/basic-auth/basic-auth'
import { etag } from '../../src/middleware/etag/etag'

const app = new Hono()

// Mount Builtin Middleware
app.use('*', poweredBy())
app.use('*', logger())
app.use('/form', bodyParse())
app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
app.use('/etag/*', etag())

// Custom Middleware
// Add Custom Header
app.use('/hello/*', async (c, next) => {
  await next()
  c.header('X-message', 'This is addHeader middleware!')
})

// Add X-Response-Time header
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  c.header('X-Response-Time', `${ms}ms`)
})

// Custom Not Found Message
app.notFound((c) => {
  return c.text('Custom 404 Not Found', 404)
})

// Error handling
app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Custom Error Message', 500)
})

// Routing
app.get('/', (c) => c.text('Hono!!'))
// Use Response object directly
app.get('/hello', () => new Response('This is /hello'))

// Named parameter
app.get('/entry/:id', (c) => {
  const id = c.req.param('id')
  return c.text(`Your ID is ${id}`)
})

// Nested route
const book = app.route('/book')
book.get('/', (c) => c.text('List Books'))
book.get('/:id', (c) => {
  const id = c.req.param('id')
  return c.text('Get Book: ' + id)
})
book.post('/', (c) => c.text('Create Book'))

// Redirect
app.get('/redirect', (c) => c.redirect('/'))
// Authentication required
app.get('/auth/*', (c) => c.text('You are authorized'))
// ETag
app.get('/etag/cached', (c) => c.text('Is this cached?'))

// Async
app.get('/fetch-url', async (c) => {
  const response = await fetch('https://example.com/')
  return c.text(`https://example.com/ is ${response.status}`)
})

// Request headers
app.get('/user-agent', (c) => {
  const userAgent = c.req.header('User-Agent')
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
// default route
app.get('/api/*', (c) => c.text('API endpoint is not found', 404))

app.post('/form', async (c) => {
  return c.json(c.req.parsedBody || {})
  //return new Response('ok /form')
})

// Throw Error
app.get('/error', () => {
  throw Error('Error has occurred')
})
app.get('/type-error', () => 'return not Response instance')

// addEventListener
app.fire()
