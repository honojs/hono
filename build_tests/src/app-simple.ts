import { Hono } from '../../src/hono'

const app = new Hono()
app.get('/', (c) => c.text('Hono!'))

export default app

export const shouldNotBeIncluded = ['http-exception', '/jsx/']
