# Basic Auth Middleware

## Usage

```js
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

const app = new Hono()

app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)

app.get('/auth/page', (c) => {
  return c.text('You are authorized')
})

app.fire()
```

For Fastly Compute@Edge, polyfill `crypto` or use `crypto-js`.

Install:

```
npm i crypto-js
```

Override `hashFunction`:

```js
import { SHA256 } from 'crypto-js'

app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
    hashFunction: (d: string) => SHA256(d).toString(), // <---
  })
)
```
