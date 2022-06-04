# Bearer Auth Middleware

## Usage

```ts
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

const app = new Hono()

const token = 'honoisacool'

app.use('/auth/*', bearerAuth({ token }))

app.get('/auth/page', (c) => {
  return c.text('You are authorized')
})

app.fire()
```
