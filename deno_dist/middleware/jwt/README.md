# JWT Middleware

## Usage

```js
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono()

app.use(
  '/auth/*',
  jwt({
    secret: 'it-is-very-secret'
  })
)

app.get('/auth/page', (c) => {
  return c.text('You are authorized')
})

app.fire()
```
