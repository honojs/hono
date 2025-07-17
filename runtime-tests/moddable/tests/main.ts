// @ts-expect-error Internal API
import { Listener } from 'socket'
import { Hono } from '../../../src'
import { handle } from '../../../src/adapter/moddable'

const app = new Hono().get('/', (c) =>
  c.json({
    hono: 'moddable',
  })
)

const listener = new Listener({ port: 3000 })
listener.callback = handle(app)
