const Hono = require('../../src/hono')

const app = Hono()

app.get('/', () => new Response('Root Page!'))

app.get('/hello', () => new Response('GET Hello!'))
app.put('/hello', () => new Response('PUT Hello!'))
app.post('/hello', () => new Response('POST Hello!'))
app.delete('/hello', () => new Response('DELETE Hello!'))

app.get('/user', () => new Response('User'))
app.get('/user/comments', () => new Response('User Comments'))
app.get('/user/avatar', () => new Response('User Avatar'))
app.get('/user/lookup/username/:username', () => new Response('User Lookup Username'))
app.get('/user/lookup/email/:address', () => new Response('User Lookup Email Address'))
app.get('/event/:id', () => new Response('Event'))
app.get('/event/:id/comments', () => new Response('Event Comments'))
app.post('/event/:id/comments', () => new Response('POST Event Comments'))
app.post('/status', () => new Response('Status'))
app.get('/very/deeply/nested/route/hello/there', () => new Response('Very Deeply Nested Route'))
app.get('/static/*', () => new Response('Static'))

app.get('/foo/bar', () => new Response('GET Foo Bar!'))
app.put('/foo/bar', () => new Response('PUT Foo Bar!'))
app.post('/foo/bar', () => new Response('POST Foo Bar!'))
app.delete('/foo/bar', () => new Response('DELETE Foo Bar!'))

app.get('/todos', () => new Response('Todos Index!'))
app.get(
  '/todos/:id',
  (c) =>
    new Response(`Todo #${c.req.params('id')}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    })
)

app.post('/todos', async (c) => {
  const content = await c.req.json()
  return new Response('Creating Todo: ' + JSON.stringify(content))
})

app.all('*', () => new Response('Not Found.', { status: 404 }))

app.fire()
