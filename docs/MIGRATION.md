# Migration Guide

## v3.12.x to v4.0.0

There are some breaking changes.

### Removal of deprecated features

- AWS Lambda Adapter - `LambdaFunctionUrlRequestContext` is obsolete. Use `ApiGatewayRequestContextV2` instead.
- Next.js Adapter - `hono/nextjs` is obsolete. Use `hono/vercel` instead.
- Context - `c.jsonT()` is obsolete. Use `c.json()` instead.
- Context - `c.stream()` and `c.streamText()` are obsolete. Use `stream()` and `streamText()` in `hono/streaming` instead.
- Context - `c.env()` is obsolete. Use `getRuntimeKey()` in `hono/adapter` instead.
- Hono - `app.showRoutes()` is obsolete. Use `showRoutes()` in `hono/dev` instead.
- Hono - `app.routerName` is obsolete. Use `getRouterName()` in `hono/dev` instead.
- Hono - `app.head()` is no longer used. `app.get()` implicitly handles the HEAD method.
- Hono - `app.handleEvent()` is obsolete. Use `app.fetch()` instead.
- HonoRequest - `req.cookie()` is obsolete. Use `getCookie()` in `hono/cookie` instead.
- HonoRequest - `headers()`, `body()`, `bodyUsed()`, `integrity()`, `keepalive()`, `referrer()`, and `signal()` are obsolete. Use the methods in `req.raw` such as `req.raw.headers()`.

### `serveStatic` in Cloudflare Workers Adapter requires `manifest`

If you use the Cloudflare Workers adapter's `serve-static`, you should specify the `manifest` option.

```ts
import manifest from '__STATIC_CONTENT_MANIFEST'

// ...

app.use('/static/*', serveStatic({ root: './assets', manifest }))
```

### Others

- The default value of `docType` option in JSX Renderer Middleware is now `true`.
- `FC` in `hono/jsx` does not pass `children`. Use `PropsWithChildren`.
- Some Mime Types are removed https://github.com/honojs/hono/pull/2119.
- Types for chaining routes with middleware matter: https://github.com/honojs/hono/pull/2046.
- Types for the validator matter: https://github.com/honojs/hono/pull/2130.

## v2.7.8 to v3.0.0

There are some breaking changes.
In addition to the following, type mismatches may occur.

### `c.req` is now `HonoRequest`

`c.req` becomes `HonoRequest`, not `Request`.
Although APIs are almost same, but if you want to access `Request`, use `c.req.raw`.

```ts
app.post('/', async (c) => {
  const metadata = c.req.raw.cf?.hostMetadata?
  ...
})
```

### StaticRouter is obsolete

You can't use `StaticRouter`.

### Validator is changed

Previous Validator Middleware is obsolete.
You can still use `hono/validator`, but the API has been changed.
See [the document](https://hono.dev).

### `serveStatic` is provided from Adapter

Serve Static Middleware is obsolete. Use Adapters instead.

```ts
// For Cloudflare Workers
import { serveStatic } from 'hono/cloudflare-workers'

// For Bun
// import { serveStatic } from 'hono/bun'

// For Deno
// import { serveStatic } from 'npm:hono/deno'

// ...

app.get('/static/*', serveStatic({ root: './' }))
```

### `serveStatic` for Cloudflare Workers "Service Worker mode" is obsolete

For Cloudflare Workers, the `serveStatic` is obsolete in Service Worker mode.

Note: Service Worker mode is that using `app.fire()`.
We recommend use "Module Worker" mode with `export default app`.

### Use `type` to define the Generics for `new Hono`

You must use `type` to define the Generics for `new Hono`. Do not use `interface`.

```ts
// Should use `type`
type Bindings = {
  TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()
```

## v2.7.1 - v2.x.x

### Current Validator Middleware is deprecated

At the next major version, Validator Middleware will be changed with "breaking changes". Therefore, the current Validator Middleware will be deprecated; please use 3rd-party Validator libraries such as [Zod](https://zod.dev) or [TypeBox](https://github.com/sinclairzx81/typebox).

```ts
import { z } from 'zod'

//...

const schema = z.object({
  title: z.string().max(100),
})

app.post('/posts', async (c) => {
  const body = await c.req.parseBody()
  const res = schema.safeParse(body)
  if (!res.success) {
    return c.text('Invalid!', 400)
  }
  return c.text('Valid!')
})
```

## v2.2.5 to v2.3.0

There is a breaking change associated to the security update.

### Basic Auth Middleware and Bearer Auth Middleware

If you are using Basic Auth and Bearer Auth in your Handler (nested), change as follows:

```ts
app.use('/auth/*', async (c, next) => {
  const auth = basicAuth({ username: c.env.USERNAME, password: c.env.PASSWORD })
  return auth(c, next) // Older: `await auth(c, next)`
})
```

## v2.0.9 to v2.1.0

There are two BREAKING CHANGES.

### `c.req.parseBody` does not parse JSON, text, and ArrayBuffer

**DO NOT** use `c.req.parseBody` for parsing **JSON**, **text**, or **ArrayBuffer**.

`c.req.parseBody` now only parses FormData with content type `multipart/form` or `application/x-www-form-urlencoded`. If you want to parse JSON, text, or ArrayBuffer, use `c.req.json()`, `c.req.text()`, or `c.req.arrayBuffer()`.

```ts
// `multipart/form` or `application/x-www-form-urlencoded`
const data = await c.req.parseBody()

const jsonData = await c.req.json() // for JSON body
const text = await c.req.text() // for text body
const arrayBuffer = await c.req.arrayBuffer() // for ArrayBuffer
```

### The arguments of Generics for `new Hono` have been changed

Now, the constructor of "Hono" receives `Variables` and `Bindings`.
"Bindings" is for types of environment variables for Cloudflare Workers. "Variables" is for types of `c.set`/`c.get`

```ts
type Bindings = {
  KV: KVNamespace
  Storage: R2Bucket
}

type WebClient = {
  user: string
  pass: string
}

type Variables = {
  client: WebClient
}

const app = new Hono<{ Variables: Variables; Bindings: Bindings }>()

app.get('/foo', (c) => {
  const client = c.get('client') // client is WebClient
  const kv = c.env.KV // kv is KVNamespace
  //...
})
```

## v1.6.4 to v2.0.0

There are many BREAKING CHANGES. Please follow instructions below.

### The way to import Middleware on Deno has been changed

**DO NOT** import middleware from `hono/mod.ts`.

```ts
import { Hono, poweredBy } from 'https://deno.land/x/hono/mod.ts' // <--- NG
```

`hono/mod.ts` does not export middleware.
To import middleware, use `hono/middleware.ts`:

```ts
import { Hono } from 'https://deno.land/x/hono/mod.ts'
import { poweredBy, basicAuth } from 'https://deno.land/x/hono/middleware.ts'
```

### Cookie middleware is obsolete

**DO NOT** use `cookie` middleware.

```ts
import { cookie } from 'hono/cookie' // <--- Obsolete!
```

You do not have to use Cookie middleware to parse or set cookies.
They become default functions:

```ts
// Parse cookie
app.get('/entry/:id', (c) => {
  const value = c.req.cookie('name')
  ...
})
```

```ts
app.get('/', (c) => {
  c.cookie('delicious_cookie', 'choco')
  return c.text('Do you like cookie?')
})
```

### Body parse middleware is obsolete

**DO NOT** use `body-parse` middleware.

```ts
import { bodyParse } from 'hono/body-parse' // <--- Obsolete!
```

You do not have to use Body parse middleware to parse request body. Use `c.req.parseBody()` method instead.

```ts
// Parse Request body
 app.post('', (c) => {
   const body = c.req.parseBody()
   ...
 })
```

### GraphQL Server middleware is obsolete

**DO NOT** use `graphql-server` middleware.

```ts
import { graphqlServer } from 'hono/graphql-server' // <--- Obsolete!
```

It might be distributed as third-party middleware.

### Mustache middleware is obsolete

**DO NOT** use `mustache` middleware.

```ts
import { mustache } from 'hono/mustache' // <--- Obsolete!
```

It will no longer be implemented.
