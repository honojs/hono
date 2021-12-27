const { Router } = require('itty-router')

const router = Router()

router.get('/', () => new Response('Root Page!'))
router.get('/hello', () => new Response('GET Hello!'))
router.put('/hello', () => new Response('PUT Hello!'))
router.post('/hello', () => new Response('POST Hello!'))
router.delete('/hello', () => new Response('DELETE Hello!'))

router.get('/user', () => new Response('User'))
router.get('/user/comments', () => new Response('User Comments'))
router.get('/user/avatar', () => new Response('User Avatar'))
router.get('/user/lookup/username/:username', () => new Response('User Lookup Username'))
router.get('/user/lookup/email/:address', () => new Response('User Lookup Email Address'))
router.get('/event/:id', () => new Response('Event'))
router.get('/event/:id/comments', () => new Response('Event Comments'))
router.post('/event/:id/comments', () => new Response('POST Event Comments'))
router.post('/status', () => new Response('Status'))
router.get('/very/deeply/nested/route/hello/there', () => new Response('Very Deeply Nested Route'))
router.get('/static/*', () => new Response('Static'))

router.get('/foo/bar', () => new Response('GET Foo Bar!'))
router.put('/foo/bar', () => new Response('PUT Foo Bar!'))
router.post('/foo/bar', () => new Response('POST Foo Bar!'))
router.delete('/foo/bar', () => new Response('DELETE Foo Bar!'))

router.get('/todos', () => new Response('Todos Index!'))
router.get(
  '/todos/:id',
  ({ params }) =>
    new Response(`Todo #${params.id}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    })
)

router.post('/todos', async (request) => {
  const content = await request.json()
  return new Response('Creating Todo: ' + JSON.stringify(content))
})

router.all('*', () => new Response('Not Found.', { status: 404 }))

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request)))
