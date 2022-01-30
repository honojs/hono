# Mustache Middleware

Mustache Middleware is available only on Cloudflare Workers.

## Dependencies

This middleware depends on [mustache.js](https://www.npmjs.com/package/mustache).

```plain
npm i mustache
```

or

```plain
yarn add mustache
```

## Usage

index.js:

```js
import { Hono, Middleware } from 'hono'

const app = new Hono()

app.use('*', Middleware.mustache())

app.get('/', (c) => {
  return c.render(
    'index',
    { name: 'Hono[炎]', title: 'Hono mustache exaple' }, // Parameters
    { footer: 'footer', header: 'header' } // Partials
  )
})

app.fire()
```

index.mustache:

```mustache
{{> header}}
<h1>Hello! {{name}}</h1>
{{> footer}}
```

header.mustache:

```mustache
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{{title}}</title>
  </head>
  </body>
```

footer.mustache:

```mustache
  </body>
</html>
```
