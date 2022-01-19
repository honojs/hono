import { Hono, Middleware } from '../../../dist'
import * as Controller from './controller'

export const app = new Hono()

app.use('/posts/*', Middleware.logger())

app.get('/', Controller.root)

app.get('/posts', Controller.list)
app.post('/posts', Controller.create)
app.get('/posts/:id', Controller.show)
app.put('/posts/:id', Controller.update)
app.delete('/posts/:id', Controller.destroy)

app.fire()
