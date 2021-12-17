const Hono = require('../../src/hono')
const app = Hono()

app.get('/', () => 'Hono!!')
app.get('/hello', () => 'This is /hello')

app.fire()
