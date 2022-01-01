# Hono

Hono [炎] - Tiny web framework for Cloudflare Workers and others.

```js
const { Hono } = require('hono')
const app = new Hono()

app.get('/', () => new Response('Hono!!'))

app.fire()
```

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

## Middleware

```js
const logger = (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  next()
}

const addHeader = (c, next) => {
  next()
  c.res.headers.add('x-message', 'This is middleware!')
}

app = app.use('*', logger)
app = app.use('/message/*', addHeader)

app.get('/message/hello', () => 'Hello Middleware!')
```

## Context

### req

```js
app.get('/hello', (c) => {
  const userAgent = c.req.headers('User-Agent')
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
