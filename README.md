# Hono

Hono [炎] - Tiny web framework for Cloudflare Workers and others.

```js
const app = Hono()

app.get('/', () => 'Hono!!')

app.fire()
```

## Feature

- Fast - the router is implemented with Trie-Tree structure.
- Tiny - use only standard API.
- Portable - zero dependencies.
- Optimized for Cloudflare Workers.

## Install

```sh
$ yarn add hono
```

or

```sh
$ npm install hono
```

## Methods

- app.**HTTP_METHOD**(path, ...callback)
- app.**all**(path, ...callback)
- app.**route**(path)
- app.**before**(...callback)
- app.**after**(...callback)

## Routing

### Basic

`app.HTTP_METHOD`

```js
app.get('/', () => 'GET /')
app.post('/', () => 'POST /')
app.get('/wild/*/card', () => 'GET /wild/*/card')
```

`app.all`

```js
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
  .get(() => 'GET /api/book')
  .post(() => 'POST /api/book')
  .put(() => 'PUT /api/book')
```

## Middleware

```js
const logger = (req, _) => {
  console.log(`${req.method}` : `${req.url}`)
}

app.before('/*', logger)

const addHeader = (_, res) => {
  res.headers.add('X-message', 'This is addHeader middleware!')
}
const customNotFound = (_, res) => {
  if (res.status == 404) {
    return new Response('404 Not Found!!', {
      status: 404
    })
  }
}

app.after('/*', addHeader, customNotFound)
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

- itty-router <https://github.com/kwhitley/itty-router>
- Sunder <https://github.com/SunderJS/sunder>
- goblin <https://github.com/bmf-san/goblin>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
