import { Hono } from 'hono'
import { mustache } from 'hono/mustache'

const app = new Hono()

app.use('*', mustache())

app.get('/', (c) => {
  return c.render(
    'index',
    { name: 'Hono[炎]', title: 'Hono mustache example' }, // Parameters
    { footer: 'footer', header: 'header' } // Partials
  )
})

app.fire()
