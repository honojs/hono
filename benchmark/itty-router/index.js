const { Router } = require('itty-router')

const router = Router()

router.get('/', () => new Response('Root Page!'))
router.get('/hello', () => new Response('GET Hello!'))
router.put('/hello', () => new Response('PUT Hello!'))
router.post('/hello', () => new Response('POST Hello!'))
router.delete('/hello', () => new Response('DELETE Hello!'))

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

addEventListener('fetch', (event) =>
  event.respondWith(router.handle(event.request))
)
