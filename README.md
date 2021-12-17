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

```sh
$ yarn add hono
```

or

```sh
$ npm install hono
```

## Routing

### Basic

```js
app.get('/', () => 'GET /')
app.post('/', () => 'POST /')
app.get('/wild/*/card', () => 'GET /wild/*/card')
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

## Related projects

- goblin <https://github.com/bmf-san/goblin>
- itty-router <https://github.com/kwhitley/itty-router>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
