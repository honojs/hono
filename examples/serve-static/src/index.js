import { Hono, Middleware } from '../../../dist'

const hono = new Hono()

hono.use('/static/*', Middleware.serveStatic({ root: './assets' }))
hono.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

hono.fire()
