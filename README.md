# Hono\[炎\]

<p>
<a href="https://github.com/yusukebe/hono/blob/master/README.md">English</a>
&#x000B7;
<a href="https://github.com/yusukebe/hono/blob/master/docs/README.ja.md">日本語</a>
</p>

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/yusukebe/hono/ci)](https://github.com/yusukebe/hono/actions)
[![GitHub](https://img.shields.io/github/license/yusukebe/hono)](https://github.com/yusukebe/hono/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/hono)](https://www.npmjs.com/package/hono)
[![npm](https://img.shields.io/npm/dm/hono)](https://www.npmjs.com/package/hono)
[![npm type definitions](https://img.shields.io/npm/types/hono)](https://www.npmjs.com/package/hono)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/yusukebe/hono)](https://github.com/yusukebe/hono/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/yusukebe/hono)](https://github.com/yusukebe/hono/commits/master)

Hono[炎] - _**means flame🔥 in Japanese**_ - is small, simple, and ultrafast web framework for Cloudflare Workers and Fastly Compute@Edge.

```js
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

app.fire()
```

## Features

- **Ultrafast** - the router does not use linear loops.
- **Zero-dependencies** - using only Service Worker and Web standard API.
- **Middleware** - built-in middleware and ability to extend with your own middleware.
- **TypeScript** - first-class TypeScript support.
- **Optimized** - for Cloudflare Workers.

## Benchmark

**Hono is fastest**, compared to other routers for Cloudflare Workers.

```plain
hono x 809,503 ops/sec ±6.94% (73 runs sampled)
itty-router x 157,310 ops/sec ±4.31% (87 runs sampled)
sunder x 328,350 ops/sec ±2.30% (95 runs sampled)
worktop x 209,758 ops/sec ±4.28% (83 runs sampled)
Fastest is hono
✨  Done in 60.66s.
```

## Hono in 1 minute

A demonstration to create an application for Cloudflare Workers with Hono.

![Demo](https://user-images.githubusercontent.com/10682/151973526-342644f9-71c5-4fee-81f4-64a7558bb192.gif)

Now, the named path parameter has types.

![Demo](https://user-images.githubusercontent.com/10682/154179671-9e491597-6778-44ac-a8e6-4483d7ad5393.png)

## Install

You can install Hono from the npm registry.

```
$ yarn add hono
```

or

```
$ npm install hono
```

## Methods

An instance of `Hono` has these methods.

- app.**HTTP_METHOD**(path, handler)
- app.**all**(path, handler)
- app.**route**(path)
- app.**use**(path, middleware)
- app.**notFound**(handler)
- app.**onError**(err, handler)
- app.**fire**()
- app.**fetch**(request, env, event)
- app.**request**(path, option)

## Routing

### Basic

```js
// HTTP Methods
app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))

// Wildcard
app.get('/wild/*/card', (c) => {
  return c.text('GET /wild/*/card')
})

// Any HTTP methods
app.all('/hello', (c) => c.text('Any Method /hello'))
```

### Named Parameter

```js
app.get('/user/:name', (c) => {
  const name = c.req.param('name')
  ...
})
```

### Regexp

```js
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const date = c.req.param('date')
  const title = c.req.param('title')
  ...
})
```

### Nested route

```js
const book = app.route('/book')
book.get('/', (c) => c.text('List Books')) // GET /book
book.get('/:id', (c) => {
  // GET /book/:id
  const id = c.req.param('id')
  return c.text('Get Book: ' + id)
})
book.post('/', (c) => c.text('Create Book')) // POST /book
```

### no strict

If `strict` is set false, `/hello`and`/hello/` are treated the same.

```js
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

## Middleware

### Built-in Middleware

Hono has built-in middleware.

```js
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

Available built-in middleware is listed on [src/middleware](https://github.com/yusukebe/hono/tree/master/src/middleware).

### Custom Middleware

You can write your own middleware.

```js
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

To handle Request and Reponse, you can use `Context` object.

### c.req

```js
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

// Captured params
app.get('/entry/:id', (c) => {
  const id = c.req.param('id')
  ...
})
```

### Shortcuts for Response

```js
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

```js
new Response('Thank you for comming', {
  status: 201,
  statusText: 'Created',
  headers: {
    'X-Message': 'Hello',
    'Content-Type': 'text/plain',
    'Content-Length': '22',
  },
})
```

### c.text()

Render text as `Content-Type:text/plain`.

```js
app.get('/say', (c) => {
  return c.text('Hello!')
})
```

### c.json()

Render JSON as `Content-Type:application/json`.

```js
app.get('/api', (c) => {
  return c.json({ message: 'Hello!' })
})
```

### c.html()

Render HTML as `Content-Type:text/html`.

```js
app.get('/', (c) => {
  return c.html('<h1>Hello! Hono!</h1>')
})
```

### c.notFound()

Return the `Not Found` Response.

```js
app.get('/notfound', (c) => {
  return c.notFound()
})
```

### c.redirect()

Redirect, default status code is `302`.

```js
app.get('/redirect', (c) => c.redirect('/'))
app.get('/redirect-permanently', (c) => c.redirect('/', 301))
```

### c.res

```js
// Response object
app.use('/', (c, next) => {
  next()
  c.res.headers.append('X-Debug', 'Debug message')
})
```

### c.event

```js
// FetchEvent object
app.use('*', async (c, next) => {
  c.event.waitUntil(
    ...
  )
  await next()
})
```

### c.env

```js
// Environment object for Cloudflare Workers
app.get('*', async c => {
  const counter = c.env.COUNTER
  ...
})
```

## fire

`app.fire()` do this.

```js
addEventListener('fetch', (event) => {
  event.respondWith(this.handleEvent(event))
})
```

## fetch

`app.fetch` for Cloudflare Module Worker syntax.

```js
export default {
  fetch(request: Request, env: Env, event: FetchEvent) {
    return app.fetch(request, env, event)
  },
}

/*
or just do:
export default app
*/
```

## request

`request` is a useful method for testing.

```js
test('GET /hello is ok', async () => {
  const res = await app.request('http://localhost/hello')
  expect(res.status).toBe(200)
})
```

## Cloudflare Workers with Hono

Using [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/) or [Miniflare](https://miniflare.dev), you can develop the application locally and publish it with few commands.

Let's write your first code for Cloudflare Workers with Hono.

---

### Caution

**Wrangler 1.x** does not support importing middleware. We recommend two ways:

1. Use [Wragler 2.0 Beta](https://github.com/cloudflare/wrangler2).
2. Build without webpack 4.x. For example, you can use esbuild. See [the starter template](https://github.com/yusukebe/hono-minimal).

---

### 1. `npm init`

Make a npm skeleton directory.

```
$ mkdir hono-example
$ cd hono-example
$ npm init -y
```

### 2. `wrangler init`

Initialize as a wrangler project.

```
$ npx wrangler@beta init
```

Answer the questions. If you want, you can answer `y`.

```
Would you like to install wrangler into your package.json? (y/n) <--- n
Would you like to use TypeScript? (y/n) <--- n
Would you like to create a Worker at src/index.js? (y/n) <--- n
```

### 3. `npm install hono`

Install `hono` from the npm registry.

```
$ npm i hono
```

### 4. Write your app

Only 4 lines!!

```js
// index.js
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello! Hono!'))

app.fire()
```

### 5. Run

Run the development server locally. Then, access `http://127.0.0.1:8787/` in your Web browser.

```
$ npx wrangler@beta dev index.js
```

### 6. Publish

Deploy to Cloudflare. That's all!

```
$ npx wrangler@beta publish index.js
```

## Starter template

You can start making your Cloudflare Workers application with [the starter template](https://github.com/yusukebe/hono-minimal). It is really minimal using TypeScript, esbuild, and Miniflare.

To generate a project skelton, run this command.

```
$ wrangler generate my-app https://github.com/yusukebe/hono-minimal
```

## Related projects

Implementation of the original router `TrieRouter` is inspired by [goblin](https://github.com/bmf-san/goblin). `RegExpRouter` is inspired by [Router::Boom](https://github.com/tokuhirom/Router-Boom). API design is inspired by [express](https://github.com/expressjs/express) and [koa](https://github.com/koajs/koa). [itty-router](https://github.com/kwhitley/itty-router), [Sunder](https://github.com/SunderJS/sunder), and [worktop](https://github.com/lukeed/worktop) are the other routers or frameworks for Cloudflare Workers.

- express <https://github.com/expressjs/express>
- koa <https://github.com/koajs/koa>
- itty-router <https://github.com/kwhitley/itty-router>
- Sunder <https://github.com/SunderJS/sunder>
- goblin <https://github.com/bmf-san/goblin>
- worktop <https://github.com/lukeed/worktop>
- Router::Boom <https://github.com/tokuhirom/Router-Boom>

## Contributing

Contributions Welcome! You can contribute by the following way.

- Write or fix documents
- Write code of middleware
- Fix bugs
- Refactor the code
- etc.

Let's make Hono together!

## Contributors

Thanks to [all contributors](https://github.com/yusukebe/hono/graphs/contributors)!

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
