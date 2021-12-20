const Hono = require('../../src/hono')
const app = Hono()

app.get('/', () => 'Hono!!')
app.get('/hello', () => 'This is /hello')

app.fire()

const router = app.router()

router.get('/:id', (req, res) => {
  req.query
  req.params
  res.status(200).json({ message: 'hello' })
})

app.use('/', router)
app.all('/', router)

const logger = (req) => {
  const url = req.newURL
  console.log(req.url.pathname)
}

app.get('/hello', logger, (req) => {
  const message = body.URLSearchParams.get('message')
  const res = req.newResponse()
  res.json({ message: message })
  return res
})

app.handle({ method: 'GET', path: '/hello?message=hello' })

Application
Router
