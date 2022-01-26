# Hono

Hono[炎] - _**means flame🔥 in Japanese**_ - is small, simple, and ultrafast web flamework for a Service Workers API based serverless such as Cloudflare Workers and Fastly Compute@Edge.

```js
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

app.fire()
```

## Features

- **Ultra fast** - the router is implemented with Trie-Tree structure.
- **Zero dependencies** - using only Web standard API.
- **Middleware** - builtin middleware, and you can make your own middleware.
- **Optimized** - for Cloudflare Workers.

## Benchmark

**Hono is fastest** compared to other routers for Cloudflare Workers.

```plain
hono x 708,671 ops/sec ±2.58% (58 runs sampled)
itty-router x 159,610 ops/sec ±2.86% (87 runs sampled)
sunder x 322,846 ops/sec ±2.24% (86 runs sampled)
worktop x 223,625 ops/sec ±2.01% (95 runs sampled)
Fastest is hono
✨  Done in 57.83s.
```

## Hono in 1 minute

Below is a demonstration to create an application of Cloudflare Workers with Hono.

![Demo](https://user-images.githubusercontent.com/10682/151102477-be0f950e-8d23-49c5-b6d8-d8ecb6b7484e.gif)

## Install

You can install from npm registry:

```sh
yarn add hono
```

or

```sh
npm install hono
```

## Methods

Instance of `Hono` has these methods:

- app.**HTTP_METHOD**(path, handler)
- app.**all**(path, handler)
- app.**route**(path)
- app.**use**(path, middleware)
- app.**fire**()
- app.**fetch**(request, env, event)

## Routing

### Basic

`app.HTTP_METHOD`

```js
// HTTP Methods
app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))

// Wildcard
app.get('/wild/*/card', (c) => {
  return c.text('GET /wild/*/card')
})
```

`app.all`

```js
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
```

### Chained Route

```js
app
  .route('/api/book')
    .get(() => {...})
    .post(() => {...})
    .put(() => {...})
```

## async/await

```js
app.get('/fetch-url', async (c) => {
  const response = await fetch('https://example.com/')
  return c.text(`Status is ${response.status}`)
})
```

## Middleware

### Builtin Middleware

```js
import { Hono, Middleware } from 'hono'

...

app.use('*', Middleware.poweredBy())
app.use('*', Middleware.logger())
app.use(
  '/auth/*',
  Middleware.basicAuth({
    username: 'hono',
    password: 'acoolproject',
  })
)
```

Available builtin middleware are listed on [src/middleware](https://github.com/yusukebe/hono/tree/master/src/middleware).

### Custom Middleware

You can write your own middleware:

```js
// Custom logger
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

// Add a custom header
app.use('/message/*', async (c, next) => {
  await next()
  await c.res.headers.add('x-message', 'This is middleware!')
})

app.get('/message/hello', (c) => c.text('Hello Middleware!'))
```

### Custom 404 Response

You can customize 404 Not Found response:

```js
app.use('*', async (c, next) => {
  await next()
  if (c.res.status === 404) {
    c.res = new Response('Custom 404 Not Found', { status: 404 })
  }
})
```

### Handling Error

```js
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (err) {
    console.error(`${err}`)
    c.res = new Response('Custom Error Message', { status: 500 })
  }
})
```

### Complex Pattern

You can also do this:

```js
// Output response time
app.use('*', async (c, next) => {
  await next()
  const responseTime = await c.res.headers.get('X-Response-Time')
  console.log(`X-Response-Time: ${responseTime}`)
})

// Add X-Response-Time header
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  await c.res.headers.append('X-Response-Time', `${ms}ms`)
})
```

## Context

To handle Request and Reponse easily, you can use Context object:

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
  c.header('X-Message', 'Hello!')
  c.header('Content-Type', 'text/plain')
  c.status(201)
  c.statusText('201 Content Created')
  return c.body('Thank you for comming')
  /*
  Same as:
  return new Response('Thank you for comming', {
    status: 201,
    statusText: '201 Content Created',
    headers: {
      'X-Message': 'Hello',
      'Content-Type': 'text/plain'
    }
  })
  */
})
```

### c.text()

Render text as `Content-Type:text/plain`:

```js
app.get('/say', (c) => {
  return c.text('Hello!')
})
```

### c.json()

Render JSON as `Content-Type:application/json`:

```js
app.get('/api', (c) => {
  return c.json({ message: 'Hello!' })
})
```

### c.html()

Render HTML as `Content-Type:text/html`:

```js
app.get('/', (c) => {
  return c.html('<h1>Hello! Hono!</h1>')
})
```

### c.redirect()

Redirect, default status code is `302`:

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

`app.fire()` do:

```js
addEventListener('fetch', (event) => {
  event.respondWith(this.handleEvent(event))
})
```

## fetch

`app.fetch()` is for Cloudflare Module Worker syntax.

```js
export default {
  fetch(request: Request, env: Env, event: FetchEvent) {
    return app.fetch(request, env, event)
  },
}
```

## Cloudflare Workers with Hono

Using `wrangler` or `miniflare`, you can develop the application locally and publish it with few commands.

Let's write your first code for Cloudflare Workers with Hono.

### 1. Install Wrangler

Install Cloudflare Command Line "[Wrangler](https://github.com/cloudflare/wrangler)"

```sh
npm i @cloudflare/wrangler -g
```

### 2. `npm init`

Make npm skeleton directory.

```sh
mkdir hono-example
cd hono-example
npm init -y
```

### 3. `wrangler init`

Init as a wrangler project.

```sh
wrangler init
```

### 4. `npm install hono`

Install `hono` from npm registry.

```sh
npm i hono
```

### 5. Write your app

Only 4 lines!!

```js
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello! Hono!'))

app.fire()
```

### 6. Run

Run the development server locally. Then, access like `http://127.0.0.1:8787/` in your Web browser.

```sh
wrangler dev
```

### Publish

Deploy to Cloudflare. That's all!

```sh
wrangler publish
```

## Related projects

Implementation of the router is inspired by [goblin](https://github.com/bmf-san/goblin). API design is inspired by [express](https://github.com/expressjs/express) and [koa](https://github.com/koajs/koa). [itty-router](https://github.com/kwhitley/itty-router), [Sunder](https://github.com/SunderJS/sunder), and [worktop](https://github.com/lukeed/worktop) are the other routers or frameworks for Cloudflare Workers.

- express <https://github.com/expressjs/express>
- koa <https://github.com/koajs/koa>
- itty-router <https://github.com/kwhitley/itty-router>
- Sunder <https://github.com/SunderJS/sunder>
- goblin <https://github.com/bmf-san/goblin>
- worktop <https://github.com/lukeed/worktop>

## Contributing

Contributions Welcome! You can contribute by the following way:

- Write or fix documents
- Write code of middleware
- Fix bugs
- Refactor the code
- etc.

If you can, let's make Hono together!

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
