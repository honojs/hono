<div align="center">
  <a href="https://github.com/honojs/hono">
    <img src="https://raw.githubusercontent.com/honojs/hono/master/docs/images/hono-title.png" width="500" height="auto" alt="Hono"/>
  </a>
</div>

<hr />

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/honojs/hono/ci)](https://github.com/honojs/hono/actions)
[![GitHub](https://img.shields.io/github/license/honojs/hono)](https://github.com/honojs/hono/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/hono)](https://www.npmjs.com/package/hono)
[![npm](https://img.shields.io/npm/dm/hono)](https://www.npmjs.com/package/hono)
[![npm type definitions](https://img.shields.io/npm/types/hono)](https://www.npmjs.com/package/hono)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/honojs/hono)](https://github.com/honojs/hono/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/honojs/hono)](https://github.com/honojs/hono/commits/master)

Hono - _**[炎] means flame🔥 in Japanese**_ - is a small, simple, and ultrafast web framework for Cloudflare Workers or Service Worker based serverless such as Fastly Compute@Edge.

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

app.fire()
```

## Features

- **Ultrafast** - the router does not use linear loops.
- **Zero-dependencies** - using only Service Worker and Web Standard API.
- **Middleware** - built-in middleware and ability to extend with your own middleware.
- **TypeScript** - first-class TypeScript support.
- **Optimized** - for Cloudflare Workers.

## Benchmark

**Hono is fastest**, compared to other routers for Cloudflare Workers.

```plain
hono - trie-router(default) x 724,143 ops/sec ±3.63% (80 runs sampled)
hono - regexp-router x 1,236,810 ops/sec ±6.77% (72 runs sampled)
itty-router x 161,786 ops/sec ±2.28% (97 runs sampled)
sunder x 312,262 ops/sec ±2.59% (85 runs sampled)
worktop x 224,979 ops/sec ±1.13% (96 runs sampled)
Fastest is hono - regexp-router
✨  Done in 95.05s.
```

## Why so fast?

Routers used in Hono are really smart.

- **TrieRouter**(default) - Implemented with Trie tree structure.
- **RegExpRouter** - Match the route with using one big Regex made before dispatch.

## Hono in 1 minute

A demonstration to create an application for Cloudflare Workers with Hono.

![Demo](https://user-images.githubusercontent.com/10682/151973526-342644f9-71c5-4fee-81f4-64a7558bb192.gif)

## Not only fast

Hono is fast. But not only fast.

### Write Less, do more

Built-in middleware make _"**Write Less, do more**"_ in reality. You can use a lot of middleware without writing code from scratch. Below are examples.

- [Basic Authentication](https://github.com/honojs/hono/tree/master/src/middleware/basic-auth/)
- [Cookie parsing / serializing](https://github.com/honojs/hono/tree/master/src/middleware/cookie/)
- [CORS](https://github.com/honojs/hono/tree/master/src/middleware/cors/)
- [ETag](https://github.com/honojs/hono/tree/master/src/middleware/etag/)
- [GraphQL Server](https://github.com/honojs/hono/tree/master/src/middleware/graphql-server/)
- [JWT Authentication](https://github.com/honojs/hono/tree/master/src/middleware/jwt/)
- [Logger](https://github.com/honojs/hono/tree/master/src/middleware/logger/)
- [Mustache template engine](https://github.com/honojs/hono/tree/master/src/middleware/mustache/) (Only for Cloudflare Workers)
- [JSON pretty printing](https://github.com/honojs/hono/tree/master/src/middleware/pretty-json/)
- [Serving static files](https://github.com/honojs/hono/tree/master/src/middleware/serve-static/) (Only for Cloudflare Workers)

To enable logger and Etag middleware with just this code.

```ts
import { Hono } from 'hono'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'

const app = new Hono()
app.use('*', etag(), logger())
```

And, the routing of Hono is so flexible. It's easy to construct large web applications.

```ts
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

const v1 = new Hono()
v1.get('/posts', (c) => {
  return c.text('list pots')
})
  .post(basicAuth({ username, password }), (c) => {
    return c.text('created!', 201)
  })
  .get('/posts/:id', (c) => {
    const id = c.req.param('id')
    return c.text(`your id is ${id}`)
  })

const app = new Hono()
app.route('/v1', v1)
```

### Web Standard

Request and Response object used in Hono are extensions of the Web Standard [Fetch API](https://developer.mozilla.org/ja/docs/Web/API/Fetch_API). If you are familiar with that, you don't need to know more than that.

### Developer Experience

Hono provides fine _"**Developer Experience**"_. Easy access to Request/Response thanks to the `Context` object.
Above all, Hono is written in TypeScript. So, Hono has _"**Types**"_!

For example, the named path parameters will be literal types.

![Demo](https://user-images.githubusercontent.com/10682/154179671-9e491597-6778-44ac-a8e6-4483d7ad5393.png)

## Install

You can install Hono from the npm registry.

```sh
npm install hono
```

## Methods

An instance of `Hono` has these methods.

- app.**HTTP_METHOD**(\[path,\]handler|middleware...)
- app.**all**(\[path,\]handler|middleware...)
- app.**route**(path, \[app\])
- app.**use**(\[path,\]middleware)
- app.**notFound**(handler)
- app.**onError**(err, handler)
- app.**fire**()
- app.**fetch**(request, env, event)
- app.**request**(path, options)

## Routing

### Basic

```ts
// HTTP Methods
app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))
app.put('/', (c) => c.text('PUT /'))
app.delete('/', (c) => c.text('DELETE /'))

// Wildcard
app.get('/wild/*/card', (c) => {
  return c.text('GET /wild/*/card')
})

// Any HTTP methods
app.all('/hello', (c) => c.text('Any Method /hello'))
```

### Named Parameter

```ts
app.get('/user/:name', (c) => {
  const name = c.req.param('name')
  ...
})
```

or all parameters at once:

```ts
app.get('/posts/:id/comment/:comment_id', (c) => {
  const { id, comment_id } = c.req.param()
  ...
})
```

### Regexp

```ts
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const { date, title } = c.req.param()
  ...
})
```

### Chained route

```ts
app
  .get('/endpoint', (c) => {
    return c.text('GET /endpoint')
  })
  .post((c) => {
    return c.text('POST /endpoint')
  })
  .delete((c) => {
    return c.text('DELETE /endpoint')
  })
```

### no strict

If `strict` is set false, `/hello`and`/hello/` are treated the same.

```ts
const app = new Hono({ strict: false }) // Default is true

app.get('/hello', (c) => c.text('/hello or /hello/'))
```

### async/await

```js
app.get('/fetch-url', async (c) => {
  const response = await fetch('https://example.com/')
  return c.text(`Status is ${response.status}`)
})
```

## Grouping

Group the routes with `Hono` instance and add them to the main app with `route` method.

```ts
const book = new Hono()

book.get('/', (c) => c.text('List Books')) // GET /book
book.get('/:id', (c) => {
  // GET /book/:id
  const id = c.req.param('id')
  return c.text('Get Book: ' + id)
})
book.post('/', (c) => c.text('Create Book')) // POST /book

const app = new Hono()
app.route('/book', book)
```

## Middleware

Middleware works after/before Handler. We can get `Request` before dispatching or manipulate `Response` after dispatching.

### Definition of Middleware

- Handler - should return `Response` object. Only one handler will be called.
- Middleware - should return nothing, will be proceeded to next middleware with `await next()`

The user can register middleware using `c.use` or using `c.HTTP_METHOD` as well as the handlers. For this feature, it's easy to specify the path and the method.

```ts
// match any method, all routes
app.use('*', logger())

// specify path
app.use('/posts/*', cors())

// specify method and path
app.post('/posts/*', basicAuth(), bodyParse())
```

If the handler returns `Response`, it will be used for the end-user, and stopping the processing.

```ts
app.post('/posts', (c) => c.text('Created!', 201))
```

In this case, four middleware are processed before dispatching like this:

```ts
logger() -> cors() -> basicAuth() -> bodyParse() -> *handler*
```

### Built-in Middleware

Hono has built-in middleware.

```ts
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { basicAuth } from 'hono/basicAuth'

const app = new Hono()

app.use('*', poweredBy())
app.use('*', logger())

app.use(
  '/auth/*',
  basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
```

Available built-in middleware is listed on [src/middleware](https://github.com/honojs/hono/tree/master/src/middleware).

### Custom Middleware

You can write your own middleware.

```ts
// Custom logger
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

// Add a custom header
app.use('/message/*', async (c, next) => {
  await next()
  c.header('x-message', 'This is middleware!')
})

app.get('/message/hello', (c) => c.text('Hello Middleware!'))
```

## Not Found

`app.notFound` for customizing Not Found Response.

```js
app.notFound((c) => {
  return c.text('Custom 404 Message', 404)
})
```

## Error Handling

`app.onError` handle the error and return the customized Response.

```js
app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Custom Error Message', 500)
})
```

## Context

To handle Request and Response, you can use `Context` object.

### c.req

```ts
// Get Request object
app.get('/hello', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  ...
})

// Shortcut to get a header value
app.get('/shortcut', (c) => {
  const userAgent = c.req.header('User-Agent')
  ...
})

// Query params
app.get('/search', (c) => {
  const query = c.req.query('q')
  ...
})

// Get all params at once
app.get('/search', (c) => {
  const { q, limit, offset } = c.req.query()
  ...
})

// Multiple query values
app.get('/search', (c) => {
  const queries = c.req.queries('q')
  // ---> GET search?q=foo&q=bar
  // queries[0] => foo, queries[1] => bar
  ...
})

// Captured params
app.get('/entry/:id', (c) => {
  const id = c.req.param('id')
  ...
})
```

### Shortcuts for Response

```ts
app.get('/welcome', (c) => {
  // Set headers
  c.header('X-Message', 'Hello!')
  c.header('Content-Type', 'text/plain')

  // Set HTTP status code
  c.status(201)

  // Return the response body
  return c.body('Thank you for comming')
})
```

The Response is the same as below.

```ts
new Response('Thank you for comming', {
  status: 201,
  headers: {
    'X-Message': 'Hello',
    'Content-Type': 'text/plain',
  },
})
```

### c.text()

Render text as `Content-Type:text/plain`.

```ts
app.get('/say', (c) => {
  return c.text('Hello!')
})
```

### c.json()

Render JSON as `Content-Type:application/json`.

```ts
app.get('/api', (c) => {
  return c.json({ message: 'Hello!' })
})
```

### c.html()

Render HTML as `Content-Type:text/html`.

```ts
app.get('/', (c) => {
  return c.html('<h1>Hello! Hono!</h1>')
})
```

### c.notFound()

Return the `Not Found` Response.

```ts
app.get('/notfound', (c) => {
  return c.notFound()
})
```

### c.redirect()

Redirect, default status code is `302`.

```ts
app.get('/redirect', (c) => c.redirect('/'))
app.get('/redirect-permanently', (c) => c.redirect('/', 301))
```

### c.res

```ts
// Response object
app.use('/', async (c, next) => {
  await next()
  c.res.headers.append('X-Debug', 'Debug message')
})
```

### c.event

```ts
// FetchEvent object
app.get('/foo', async (c) => {
  c.event.waitUntil(
    c.env.KV.put(key, data)
  )
  ...
})
```

### c.env

```ts
// Environment object for Cloudflare Workers
app.get('*', async c => {
  const counter = c.env.COUNTER
  ...
})
```

## fire

`app.fire()` do this.

```ts
addEventListener('fetch', (event) => {
  event.respondWith(this.handleEvent(event))
})
```

## fetch

`app.fetch` for Cloudflare Module Worker syntax.

```ts
export default {
  fetch(request: Request, env: Env, event: FetchEvent) {
    return app.fetch(request, env, event)
  },
}
```

or just do:

```ts
export default app
```

## request

`request` is a useful method for testing.

```js
test('GET /hello is ok', async () => {
  const res = await app.request('http://localhost/hello')
  expect(res.status).toBe(200)
})
```

## router

The `router` option specify which router is used inside. The default router is `TrieRouter`. If you want to use `RexExpRouter`, write like this:

```ts
import { RegExpRouter } from 'hono/router/reg-exp-router'

const app = new Hono({ router: new RegExpRouter() })
```

## Routing Ordering

The routing priority is decided by the order of registration. Only one handler will be dispatched.

```ts
app.get('/book/a', (c) => c.text('a')) // a
app.get('/book/:slug', (c) => c.text('common')) // common
```

```http
GET /book/a ---> `a` // common will not be dispatched
GET /book/b ---> `common` // a will not be dispatched
```

All scoring rules:

```ts
app.get('/api/*', 'c') // score 1.1 <--- `/*` is special wildcard
app.get('/api/:type/:id', 'd') // score 3.2
app.get('/api/posts/:id', 'e') // score 3.3
app.get('/api/posts/123', 'f') // score 3.4
app.get('/*/*/:id', 'g') // score 3.5
app.get('/api/posts/*/comment', 'h') // score 4.6 - not match
app.get('*', 'a') // score 0.7
app.get('*', 'b') // score 0.8
```

```plain
GET /api/posts/123
---> will match => c, d, e, f, b, a, b
---> sort by score => a, b, c, d, e, f, g
```

## Cloudflare Workers with Hono

Using [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/), you can develop the application locally and publish it with few commands.

Let's write your first code for Cloudflare Workers with Hono.

### 1. `wrangler init`

Initialize as a wrangler project.

```
mkdir hono-example
cd hono-example
npx wrangler init -y
```

### 2. `npm install hono`

Install `hono` from the npm registry.

```
npm init -y
npm i hono
```

### 3. Write your app

Edit `src/index.ts`. Only 4 lines!!

```ts
// src/index.ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello! Hono!'))

app.fire()
```

### 4. Run

Run the development server locally. Then, access `http://127.0.0.1:8787/` in your Web browser.

```
npx wrangler dev
```

### 5. Publish

Deploy to Cloudflare. That's all!

```
npx wrangler publish ./src/index.ts
```

## Starter template

You can start making your Cloudflare Workers application with [the starter template](https://github.com/honojs/hono-minimal). It is really minimal using TypeScript, esbuild, Miniflare, and Jest.

To generate a project skelton, run this command.

```
npx create-cloudflare my-app https://github.com/honojs/hono-minimal
```

## Practical Example

How about writing web API with Hono?

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'
import { prettyJSON } from 'hono/pretty-json'
import { getPosts, getPost, createPost, Post } from './model'

const app = new Hono()
app.get('/', (c) => c.text('Pretty Blog API'))
app.use('*', prettyJSON())
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404))

export interface Bindings {
  USERNAME: string
  PASSWORD: string
}

const api = new Hono<Bindings>()
api.use('/posts/*', cors())

api.get('/posts', (c) => {
  const { limit, offset } = c.req.query()
  const posts = getPosts({ limit, offset })
  return c.json({ posts })
})

api.get('/posts/:id', (c) => {
  const id = c.req.param('id')
  const post = getPost({ id })
  return c.json({ post })
})

api.post(
  '/posts',
  async (c, next) => {
    const auth = basicAuth({ username: c.env.USERNAME, password: c.env.PASSWORD })
    await auth(c, next)
  },
  async (c) => {
    const post = await c.req.json<Post>()
    const ok = createPost({ post })
    return c.json({ ok })
  }
)

app.route('/api', api)

export default app
```

## Other Examples

- Hono Examples - <https://github.com/honojs/examples>

## Related projects

Implementation of the original router `TrieRouter` is inspired by [goblin](https://github.com/bmf-san/goblin). `RegExpRouter` is inspired by [Router::Boom](https://github.com/tokuhirom/Router-Boom). API design is inspired by [express](https://github.com/expressjs/express) and [koa](https://github.com/koajs/koa). [itty-router](https://github.com/kwhitley/itty-router), [Sunder](https://github.com/SunderJS/sunder), and [worktop](https://github.com/lukeed/worktop) are the other routers or frameworks for Cloudflare Workers.

- express - <https://github.com/expressjs/express>
- koa - <https://github.com/koajs/koa>
- itty-router - <https://github.com/kwhitley/itty-router>
- Sunder - <https://github.com/SunderJS/sunder>
- goblin - <https://github.com/bmf-san/goblin>
- worktop - <https://github.com/lukeed/worktop>
- Router::Boom - <https://github.com/tokuhirom/Router-Boom>

## Contributing

Contributions Welcome! You can contribute in the following ways.

- Write or fix documents
- Write code of middleware
- Fix bugs
- Refactor the code
- etc.

## Contributors

Thanks to [all contributors](https://github.com/honojs/hono/graphs/contributors)! Especially, [@metrue](https://github.com/metrue) and [@usualoma](https://github.com/usualoma)!

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
