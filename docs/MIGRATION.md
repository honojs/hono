# Migration Guide

## v4.13.x to v5.0.0

There are some breaking changes.

### ESM only

`hono` is now published as ESM only, and the CommonJS build is removed. On Node.js, version 22.12 or later is required. `require('hono')` still works there, because Node.js 22.12 can `require()` ES modules.

### Non-Error throws go to `onError`

A non-Error value thrown from a handler or middleware, such as a string or a plain object, now goes to `onError` (500 by default) wrapped in an `Error`. The original value is available as `err.cause`, and a thrown string is also used as `err.message`. It no longer propagates out of `app.fetch()`.

### `c.req.query()` may return `undefined` values

`c.req.query()` and `c.req.queries()` without a key now return `Record<string, string | undefined>` and `Record<string, string[] | undefined>`, since a key may be absent.

```ts
// From
const { name } = c.req.query() // string

// To
const { name } = c.req.query() // string | undefined
```

### `c.req.json()` returns `unknown`

`c.req.json()` returns `Promise<unknown>` instead of `Promise<any>`. Pass the type explicitly, or use `c.req.valid()` with a validator.

```ts
// From
const body = await c.req.json() // any

// To
const body = await c.req.json<{ name: string }>()
```

### Runtime adapters moved to `@hono/*` packages

The runtime adapters under `hono/<runtime>` are no longer bundled with `hono`. Install the corresponding package and import from it.

| Before                    | After                      |
| ------------------------- | -------------------------- |
| `hono/aws-lambda`         | `@hono/aws-lambda`         |
| `hono/bun`                | `@hono/bun`                |
| `hono/cloudflare-workers` | `@hono/cloudflare-workers` |
| `hono/deno`               | `@hono/deno`               |
| `hono/lambda-edge`        | `@hono/lambda-edge`        |
| `hono/netlify`            | `@hono/netlify`            |
| `hono/service-worker`     | `@hono/service-worker`     |
| `hono/vercel`             | `@hono/vercel`             |

```ts
// From
import { serveStatic } from 'hono/bun'

// To
import { serveStatic } from '@hono/bun'
```

`hono/cloudflare-pages` is removed without a replacement. Cloudflare recommends Workers with static assets; use `hono` on Workers instead.

`hono/adapter` (`env()`, `getRuntimeKey()`) stays in `hono`.

### Removal of deprecated features

- Hono - `app.fire()` is obsolete. Use `fire()` in `@hono/service-worker` instead.
- Hono - `app.mount()` is obsolete. Use `mount()` in `hono/mount` instead.

  ```ts
  // From
  app.mount('/itty-router', ittyRouter.handle)

  // To
  app.all('/itty-router/*', mount(ittyRouter.handle))
  ```

- HonoRequest - `req.matchedRoutes` and `req.routePath` are obsolete. Use `matchedRoutes()` and `routePath()` in `hono/route` instead.
- Bearer Auth Middleware - `noAuthenticationHeaderMessage`, `invalidAuthenticationHeaderMessage`, and `invalidTokenMessage` are obsolete. Use `noAuthenticationHeader.message`, `invalidAuthenticationHeader.message`, and `invalidToken.message` instead.
- Serve Static Middleware - the `pathResolve` option is removed. It was no longer used.
- SSG Helper - `SSG_DISABLED_RESPONSE` is obsolete. Use `X_HONO_DISABLE_SSG_HEADER_KEY` instead.
- SSG Helper - the `beforeRequestHook`, `afterResponseHook`, and `afterGenerateHook` options of `toSSG()` are obsolete. Pass them as a plugin via `plugins` instead. Note that `defaultPlugin()`, which skips non-200 responses, is applied only when `plugins` is omitted, so add it explicitly if you need it.

  ```ts
  // From
  toSSG(app, fs, { beforeRequestHook })

  // To
  toSSG(app, fs, { plugins: [{ beforeRequestHook }, defaultPlugin()] })
  ```

- Utils - `timingSafeEqual()` in `hono/utils/buffer` only accepts strings. The `hashFunction` option of Basic Auth Middleware and Bearer Auth Middleware is typed as `(input: string) => string | null | Promise<string | null>` accordingly.
- Utils - `getQueryStrings()` in `hono/utils/url` is obsolete. Use the `URL` API instead.
- Utils - `UnOfficalStatusCode` in `hono/utils/http-status` is obsolete. Use `UnofficialStatusCode` instead.

## v4.3.11 to v4.4.0

### `deno.land/x` to JSR

There is no breaking change, but we no longer publish the module from `deno.land/x`. If you want to use Hono on Deno, use JSR instead of it.

If you migrate, replace the path `deno.land/x` with JSR's.

```ts
// From
import { Hono } from 'https://deno.land/x/hono/mod.ts'

// To
import { Hono } from 'jsr:@hono/hono'
```

You can see more details on our website: https://hono.dev/getting-started/deno

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
- HonoRequest - `headers()`, `body()`, `bodyUsed()`, `integrity()`, `keepalive()`, `referrer()`, and `signal()` are obsolete. Use the equivalent properties on `req.raw` such as `req.raw.headers`.

### `serveStatic` in Cloudflare Workers Adapter requires `manifest`

If you use the Cloudflare Workers adapter's `serve-static`, you should specify the `manifest` option.

```ts
import manifest from '__STATIC_CONTENT_MANIFEST'

// ...

app.use('/static/*', serveStatic({ root: './assets', manifest }))
```

### Others

- The default value of the `docType` option in JSX Renderer Middleware is now `true`.
- `FC` in `hono/jsx` does not pass `children`. Use `PropsWithChildren`.
- Some Mime Types are removed https://github.com/honojs/hono/pull/2119.
- Types for chaining routes with middleware matter: https://github.com/honojs/hono/pull/2046.
- Types for the validator matter: https://github.com/honojs/hono/pull/2130.

## v2.7.8 to v3.0.0

There are some breaking changes.
In addition to the following, type mismatches may occur.

### `c.req` is now `HonoRequest`

`c.req` becomes `HonoRequest`, not `Request`.
Although APIs are almost the same, if you want to access `Request`, use `c.req.raw`.

```ts
app.post('/', async (c) => {
  const metadata = c.req.raw.cf?.hostMetadata?
  ...
})
```

### StaticRouter is obsolete

You can't use `StaticRouter`.

### Validator has been changed

Previous Validator Middleware is obsolete.
You can still use `hono/validator`, but the API has been changed.
See [the document](https://hono.dev).

### `serveStatic` is provided from the Adapter

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
import * as z from 'zod'

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

There is a breaking change associated with the security update.

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

There are many BREAKING CHANGES. Please follow the instructions below.

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

You do not have to use Body parse middleware to parse the request body. Use `c.req.parseBody()` method instead.

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
