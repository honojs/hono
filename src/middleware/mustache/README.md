# Mustache Middleware

Mustache Middleware is available only on Cloudflare Workers.

## Requirements

This middleware depends on [mustache.js](https://www.npmjs.com/package/mustache).

```plain
npm i mustache
```

or

```plain
yarn add mustache
```

## Usage

index.ts:

```ts
import { Hono } from 'hono'
import { mustache } from 'hono/mustache'

const app = new Hono()

app.use('*', mustache())

app.get('/', (c) => {
  return c.render(
    'index',
    { name: 'Hono[炎]', title: 'Hono mustache example' }, // Parameters
    { footer: 'footer', header: 'header' } // Partials
  )
})

app.fire()
```

In Module Worker mode:

```ts
import { Hono } from 'hono'
import { mustache } from 'hono/mustache.module' // <---

const app = new Hono()
app.use('*', mustache())
// ...

export default app
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

## Example

<https://github.com/honojs/examples/tree/master/mustache-template>
