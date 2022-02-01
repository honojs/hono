import { Hono } from '../../../dist'
import { bodyParse } from '../../../dist/middleware/body-parse/body-parse'
import { cors } from '../../../dist/middleware/cors/cors'

import * as Controller from './controller'

export const app = new Hono()

app.use('/posts/*', bodyParse())
app.use('/posts/*', cors())

app.get('/', Controller.root)

app.get('/posts', Controller.list)
app.post('/posts', Controller.create)
app.get('/posts/:id', Controller.show)
app.put('/posts/:id', Controller.update)
app.delete('/posts/:id', Controller.destroy)

app.fire()
