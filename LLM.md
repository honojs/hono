
## Import
```typescript
import { Hono } from 'hono'
```

## Core Types
```typescript
import type { 
  Env, 
  ErrorHandler, 
  Handler, 
  MiddlewareHandler, 
  Next, 
  NotFoundHandler, 
  ValidationTargets, 
  Input, 
  Schema, 
  TypedResponse 
} from 'hono'
```

## Hono Class
```typescript
const app = new Hono()
```

### Constructor
```typescript
new Hono<E extends Env = BlankEnv, S extends Schema = BlankSchema, BasePath extends string = '/'>()
```

### HTTP Methods
```typescript
app.get(path, handler)
app.post(path, handler)
app.put(path, handler)
app.delete(path, handler)
app.patch(path, handler)
app.options(path, handler)
app.head(path, handler)
```

### Route Groups
```typescript
app.route(path, router)
app.basePath(path)
```

### Middleware
```typescript
app.use(path, middleware)
```

## Context API
```typescript
app.get('/', (c) => {
  // Request
  const req = c.req
  const url = c.req.url
  const method = c.req.method
  const headers = c.req.header()
  const query = c.req.query()
  const param = c.req.param()
  const json = c.req.json()
  const text = c.req.text()
  const form = c.req.formData()

  // Response
  return c.text('Hello')
  return c.json({ message: 'Hello' })
  return c.html('<h1>Hello</h1>')
  return c.redirect('/path')
  return c.body('raw body')
})
```

### Context Methods
```typescript
c.text(text, status?, headers?)
c.json(object, status?, headers?)
c.html(html, status?, headers?)
c.redirect(url, status?)
c.body(data, status?, headers?)
c.status(code)
c.header(name, value)
c.cookie(name, value, options?)
c.notFound()
c.error(error)
```

### Environment Variables
```typescript
app.get('*', async (c) => {
  const kv = c.env.KV_NAMESPACE
  const db = c.env.DATABASE
})
```

## Request Object
```typescript
const req = c.req

// Properties
req.url
req.method
req.headers
req.body

// Methods
req.header(name)
req.query(name?)
req.param(name?)
req.json()
req.text()
req.arrayBuffer()
req.blob()
req.formData()
req.valid()
```

## Response Types
```typescript
c.text('Hello World')
c.json({ message: 'Hello' })
c.html('<h1>Hello</h1>')
c.redirect('/path')
```

## Middleware
```typescript
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { cache } from 'hono/cache'

app.use(logger())
app.use(cors())
app.use('/api/*', jwt({ secret: 'secret' }))
app.use('/static/*', cache({ cacheName: 'static' }))
```

## Client
```typescript
import { hc } from 'hono/client'

const client = hc<AppType>('http://localhost:3000')
const res = await client.api.users.$get()
const data = await res.json()
```

## JSX Support
```typescript
import { jsx } from 'hono/jsx'

const App = () => <h1>Hello Hono</h1>
app.get('/', (c) => c.html(<App />))
```

## Error Handling
```typescript
app.onError((err, c) => {
  return c.text('Custom Error', 500)
})

app.notFound((c) => {
  return c.text('Not Found', 404)
})
```

## Type Definitions
```typescript
interface Env {
  Variables: {}
  Bindings: {}
}

interface Schema {
  [path: string]: {
    [method: string]: {
      input: {}
      output: {}
    }
  }
}

interface Handler<E extends Env = any, P extends string = any, I extends Input = {}> {
  (c: Context<E, P, I>): Response | Promise<Response>
}

interface MiddlewareHandler<E extends Env = any, P extends string = any, I extends Input = {}> {
  (c: Context<E, P, I>, next: Next): Response | Promise<Response>
}
```

## Advanced Usage

### Route Parameters
```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})
```

### Query Parameters
```typescript
app.get('/search', (c) => {
  const query = c.req.query('q')
  return c.json({ query })
})
```

### Validation
```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string()
})

app.post('/users', zValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json(data)
})
```

### Streaming
```typescript
app.get('/stream', (c) => {
  return c.stream(async (stream) => {
    for (let i = 0; i < 10; i++) {
      await stream.write(`data: ${i}\n\n`)
      await stream.sleep(1000)
    }
  })
})
```

### WebSocket
```typescript
import { createWS } from 'hono/ws'

const ws = createWS()

app.get('/ws', ws.handle((c) => {
  return c.websocket((ws) => {
    ws.on('message', (msg) => {
      ws.send(`Echo: ${msg}`)
    })
  })
}))
```

## Adapters
```typescript
// Cloudflare Workers
import { handle } from 'hono/cloudflare-workers'

// AWS Lambda
import { handle } from 'hono/aws-lambda'

// Deno
import { serve } from 'hono/deno'

// Bun
import { serve } from 'hono/bun'
```
'EOF'
