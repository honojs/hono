import { Hono } from './dist/index.js'
import { RegExpRouter } from './dist/router/reg-exp-router/index.js'

const app = new Hono({ router: new RegExpRouter() })

app
  .get('/', (c) => c.text('Hi'))
  .post('/json', (c) => c.req.json().then(c.json))
  .get('/id/:id', (c) => {
    const id = c.req.param('id')
    const name = c.req.query('name')
    c.header('x-powered-by', 'benchmark')
    return c.text(`${id} ${name}`)
  })

export default app
