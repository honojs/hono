import { Sunder, Router, Context } from 'sunder'

const app = new Sunder()
const router = new Router()

router.get('/', (response) => {
  response.body = 'Root Page!'
})

router.get('/hello', (response) => {
  response.body = 'GET Hello!'
})
router.put('/hello', (response) => {
  response.body = 'PUT Hello!'
})
router.post('/hello', (response) => {
  response.body = 'POST Hello!'
})
router.delete('/hello', (response) => {
  response.body = 'DELETE Hello!'
})

router.get('/foo/bar', (response) => {
  response.body = 'GET Foo Bar!'
})
router.put('/foo/bar', (response) => {
  response.body = 'PUT Foo Bar!'
})
router.post('/foo/bar', (response) => {
  response.body = 'POST Foo Bar!'
})
router.delete('/foo/bar', (response) => {
  response.body = 'DELETE Foo Bar!'
})

router.get('/todos', ({ response }) => {
  response.body = 'Todo Index!'
})
router.get('/todos/:id', ({ response, params }) => {
  response.body = `Todo #${params.id}`
})

app.use(router.middleware)

addEventListener('fetch', (event) => {
  event.respondWith(app.handle(event))
})
