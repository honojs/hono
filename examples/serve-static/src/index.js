import { Hono } from '../../../dist'
import { serveStatic } from '../../../src/middleware/serve-static/serve-static'

const hono = new Hono()

hono.use('/static/*', serveStatic({ root: './assets' }))
hono.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

hono.fire()
