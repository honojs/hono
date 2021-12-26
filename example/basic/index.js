const Hono = require('../../src/hono')
const app = Hono()

// Middleware
const logger = (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  next()
}
const addHeader = (c, next) => {
  next()
  c.res.headers.append('X-message', 'This is addHeader middleware!')
}

// Mount middleware
app.use('*', logger)
app.use('/hello', addHeader)

// Routing
app.get('/', () => new Response('Hono!!'))
app.get('/hello', () => new Response('This is /hello'))

app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  return new Response(`Your ID is ${id}`)
})

// addEventListener
app.fire()

//

const logger = (c, next) => {
  console.log(`Req: [${c.req.method}] ${c.req.url}`)
  next()
  console.log(`Respond`)
}

const auth = (c, next) => {
  const url = new URL(c.req.url)
  if (!url.pathname.match(/\/admin*/)) {
    next()
  }
  const auth = c.req.headers.get('x-auth')
  if (auth != 'auth-path') {
    return c.notFound()
  }
  next()
}

const hello = (c, next) => {
  next()
  c.res.headers.append('x-message', 'Hello!')
}

const notFound = (c, next) => {
  next()
  if (res.status === 404) {
    c.res = new Response('Not Found', {
      status: 404,
    })
  }
}

app.use('*', logger)
app.use('*', notFound)
app.use('/hello', hello)
app.use('/admin/*', auth)

app.get('/admin', () => 'Your are Admin!')

const handler = app.matchRoute('GET', '/admin')
