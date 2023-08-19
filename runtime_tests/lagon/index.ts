import { Hono } from '../../src'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { HTTPException } from '../../src/http-exception'
import { basicAuth } from '../../src/middleware/basic-auth'
import { bearerAuth } from '../../src/middleware/bearer-auth'
import { etag } from '../../src/middleware/etag'
import { poweredBy } from '../../src/middleware/powered-by'
import { prettyJSON } from '../../src/middleware/pretty-json'

const app = new Hono()

// Mount Builtin Middleware
app.use('*', poweredBy())
// app.use('*', logger())
app.use(
  '/basic-auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
app.use(
  '/bearer-auth/*',
  bearerAuth({
    token: 'secrettoken',
  })
)
app.use('/etag/*', etag())

app.get('/env', (c) => {
  const { NAME } = env<{ NAME: string }>(c)
  return c.text(NAME)
})

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
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(`${err}`)
  return c.text('Custom Error Message', 500)
})

// Routing
app.get('/', (c) => c.text('Hono!!'))
// Use Response object directly
app.get('/hello', () => new Response('This is /hello'))

app.get('/runtime', (c) => new Response(getRuntimeKey()))

// Named parameter
app.get('/entry/:id', (c) => {
  const id = c.req.param('id')
  return c.text(`Your ID is ${id}`)
})

// Nested route
const book = new Hono()
book.get('/', (c) => c.text('List Books'))
book.get('/:id', (c) => {
  const id = c.req.param('id')
  return c.text('Get Book: ' + id)
})
book.post('/', (c) => c.text('Create Book'))
app.route('/book', book)

// Redirect
app.get('/redirect', (c) => c.redirect('/'))
// Authentication required
app.get('/basic-auth/*', (c) => c.text('You are authorized'))
app.get('/bearer-auth/*', (c) => c.text('You are authorized'))
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
app.get('/api/posts', prettyJSON(), (c) => {
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
  const body = await c.req.parseBody()
  return c.json(body)
})

// Throw Error
app.get('/error', () => {
  throw Error('Error has occurred')
})

export const handler = app.fetch
