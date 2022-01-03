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
- Tiny - use only standard API.
- Portable - zero dependencies.
- Flexible - you can make your own middlewares.
- Optimized - for Cloudflare Workers and Fastly Compute@Edge.

## Benchmark

```
hono x 813,001 ops/sec ±2.96% (75 runs sampled)
itty-router x 160,415 ops/sec ±3.31% (85 runs sampled)
sunder x 307,438 ops/sec ±4.77% (73 runs sampled)
Fastest is hono
✨  Done in 37.03s.
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

- app.**HTTP_METHOD**(path, callback)
- app.**all**(path, callback)
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

app.use('*', Middleware.poweredBy)

```

### Custom Middleware

```js
const logger = async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
}

const addHeader = async (c, next) => {
  await next()
  await c.res.headers.add('x-message', 'This is middleware!')
}

app.use('*', logger)
app.use('/message/*', addHeader)

app.get('/message/hello', () => 'Hello Middleware!')
```

### Custom 404 Response

```js
const customNotFound = async (c, next) => {
  await next()
  if (c.res.status === 404) {
    c.res = new Response('Custom 404 Not Found', { status: 404 })
  }
}

app.use('*', customNotFound)
```

### Complex Pattern

```js
// Log response time
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
app.get('/hello', (c) => {
  const userAgent = c.req.headers.get('User-Agent')
  ...
})
```

### res

```js
app.use('/', (c, next) => {
  next()
  c.res.headers.append('X-Debug', 'Debug message')
})
```

## Request

### query

```js
app.get('/search', (c) => {
  const query = c.req.query('q')
  ...
})
```

### params

```js
app.get('/entry/:id', (c) => {
  const id = c.req.params('id')
  ...
})
```

## Hono in 1 minute

Create your first Cloudflare Workers with Hono from scratch.

### Demo

![Demo](https://user-images.githubusercontent.com/10682/147877447-ff5907cd-49be-4976-b3b4-5df2ac6dfda4.gif)

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
