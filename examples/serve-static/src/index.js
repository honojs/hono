import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'

const hono = new Hono()

hono.use('/static/*', serveStatic({ root: './' }))
hono.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

hono.fire()
