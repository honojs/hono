import { Hono, Middleware } from '../../dist'

const app = new Hono()

app.use('*', Middleware.mustache())

app.get('/', (c) => {
  return c.render(
    'index',
    { name: 'Hono[炎]', title: 'Hono mustache exaple' }, // Parameters
    { footer: 'footer', header: 'header' } // Partials
  )
})

app.fire()
