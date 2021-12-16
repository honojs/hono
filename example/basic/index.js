const Hono = require('../../src/hono')
const app = Hono()

// Text
app.get('/', () => 'Hono!!')

// JSON
app.get('/api', () => { return { message: 'Hello! from /api' } })

app.get('/entry', () => 'Get entry')
app.post('/entry', () => 'Post entry')

//app.route('/book')
//  .get(() => 'Get a random book')
//  .post(() => 'Add a book')
//  .put(() => 'Update a book')

// With original response header
app.get('/hello', () => {
  return new Response('Hello! from /hello', {
    status: 200,
    headers: {
      'X-Message': 'This is Hono'
    }
  })
})

const notFound = () => {
  return new Response('not found', {
    status: 404
  })
}

app.get('/not_found', (req) => {
  notFound()
})

app.fire()