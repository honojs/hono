import { Hono } from '../../dist'
import { mustache } from '../../src/middleware/mustache/mustache'

const app = new Hono()

app.use('*', mustache())

app.get('/', (c) => {
  return c.render(
    'index',
    { name: 'Hono[炎]', title: 'Hono mustache exaple' }, // Parameters
    { footer: 'footer', header: 'header' } // Partials
  )
})

app.fire()
