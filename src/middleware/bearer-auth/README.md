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

## Options

```ts
app.use(
  '/auth/*',
  bearerAuth({
    token: 'honoisacool', // Required
    realm: 'example.com',
    prefix: 'Bot'
    hashFunction: (d: string) => SHA256(d).toString(), // For Fastly Compute@Edge
  })
)
```
