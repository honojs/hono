# Hono

Hono [炎] - Tiny web framework for Cloudflare Workers and others.

```js
const app = Hono()

app.get('/', () => new Response('Hono!!'))

app.fire()
```

## Feature

- Fast - the router is implemented with Trie-Tree structure.
- Tiny - use only standard API.
- Portable - zero dependencies.
- Optimized for Cloudflare Workers.

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
app.get('/wild/*/card', => {
  return new Reponse('GET /wild/*/card')
})
```

`app.all`

```js
// Any HTTP methods
app.all('/hello', () => 'ALL Method /hello')
```

### Named Parameter

```js
app.get('/user/:name', (req) => {
  const name = req.params('name')
  ...
})
```

### Regexp

```js
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (req) => {
  const date = req.params('date')
  const title = req.params('title')
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
const logger = (req, res, next) => {
  console.log(`[${req.method}] ${req.url}`)
  next()
}

const addHeader = (req, res, next) => {
  next()
  res.headers.add('x-message', 'This is middleware!')
}

app = app.use('*', logger)
app = app.use('/message/*', addHeader)

app.get('/message/hello', () => 'Hello Middleware!')
```

## Request

### query

```js
app.get('/search', (req) => {
  const query = req.query('q')
})
```

### params

```js
app.get('/entry/:id', (req) => {
  const id = req.params('id')
})
```

## Related projects

- koa <https://github.com/koajs/koa>
- express <https://github.com/expressjs/express>
- itty-router <https://github.com/kwhitley/itty-router>
- Sunder <https://github.com/SunderJS/sunder>
- goblin <https://github.com/bmf-san/goblin>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
