# Hono

Hono [炎] - Tiny web framework for Cloudflare Workers and others.

```js
const { Hono } = require('hono')
const app = new Hono()

app.get('/', () => new Response('Hono!!'))

app.fire()
```

![carbon](https://user-images.githubusercontent.com/10682/147877725-bce9bd46-953d-4d70-9c2b-3eae47ad4df9.png)

## Feature

- Fast - the router is implemented with Trie-Tree structure.
- Portable - zero dependencies.
- Flexible - you can make your own middlewares.
- Easy - simple API, builtin middleware, and TypeScript support.
- Optimized - for Cloudflare Workers or Fastly Compute@Edge.

## Benchmark

Hono is fastest!!

```
hono x 758,264 ops/sec ±5.41% (75 runs sampled)
itty-router x 158,359 ops/sec ±3.21% (89 runs sampled)
sunder x 297,581 ops/sec ±4.74% (83 runs sampled)
Fastest is hono
✨  Done in 42.84s.
```

## Install

```
$ yarn add hono
```

or

```sh
$ npm install hono
```

## Methods

- app.**HTTP_METHOD**(path, handler)
- app.**all**(path, handler)
- app.**route**(path)
- app.**use**(path, middleware)

## Routing

### Basic

`app.HTTP_METHOD`

```js
// HTTP Methods
app.get('/', () => new Response('GET /'))
app.post('/', () => new Response('POST /'))

// Wildcard
app.get('/wild/*/card', () => {
  return new Response('GET /wild/*/card')
})
```

`app.all`

```js
// Any HTTP methods
app.all('/hello', () => new Response('ALL Method /hello'))
```

### Named Parameter

```js
app.get('/user/:name', (c) => {
  const name = c.req.params('name')
  ...
})
```

### Regexp

```js
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const date = c.req.params('date')
  const title = c.req.params('title')
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

## Async

```js
app.get('/fetch-url', async () => {
  const response = await fetch('https://example.com/')
  return new Response(`Status is ${response.status}`)
})
```

## Middleware

### Builtin Middleware

```js
const { Hono, Middleware } = require('hono')

...

app.use('*', Middleware.poweredBy())
app.use('*', Middleware.logger())

```

### Custom Middleware

```js
// Custom logger
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

// Add custom header
app.use('/message/*', async (c, next) => {
  await next()
  await c.res.headers.add('x-message', 'This is middleware!')
})

app.get('/message/hello', () => 'Hello Middleware!')
```

### Custom 404 Response

```js
app.use('*', async (c, next) => {
  await next()
  if (c.res.status === 404) {
    c.res = new Response('Custom 404 Not Found', { status: 404 })
  }
})
```

### Complex Pattern

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

### req

```js

// Get Request object
app.get('/hello', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  ...
})

// Query params
app.get('/search', (c) => {
  const query = c.req.query('q')
  ...
})

// Captured params
app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  ...
})
```

### res

```js
// Response object
app.use('/', (c, next) => {
  next()
  c.res.headers.append('X-Debug', 'Debug message')
})
```

### text

```js
app.get('/say', (c) => {
  return c.text('Hello!')
})
```

## Hono in 1 minute

Create your first Cloudflare Workers with Hono from scratch.

![Demo](https://user-images.githubusercontent.com/10682/148223268-2484a891-57c1-472f-9df3-936a5586f002.gif)

### 1. Install Wrangler

Install Cloudflare Command Line "[Wrangler](https://github.com/cloudflare/wrangler)"

```sh
$ npm i @cloudflare/wrangler -g
```

### 2. `npm init`

Make npm skeleton directory.

```sh
$ mkdir hono-example
$ ch hono-example
$ npm init -y
```

### 3. `wrangler init`

Init as a wrangler project.

```sh
$ wrangler init
```

### 4. `npm install hono`

Install `hono` from npm repository.

```
$ npm i hono
```

### 5. Write your app

Only 4 line!!

```js
const { Hono } = require('hono')
const app = new Hono()

app.get('/', () => new Response('Hello! Hono!'))

app.fire()
```

### 6. Run!

Run the development server locally.

```sh
$ wrangler dev
```

## Related projects

- koa <https://github.com/koajs/koa>
- express <https://github.com/expressjs/express>
- oak <https://github.com/oakserver/oak>
- itty-router <https://github.com/kwhitley/itty-router>
- Sunder <https://github.com/SunderJS/sunder>
- goblin <https://github.com/bmf-san/goblin>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
