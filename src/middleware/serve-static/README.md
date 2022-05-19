# Serve Static Middleware

Serve Static Middleware is available only on Cloudflare Workers.

## Usage

index.ts:

```ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

app.fire()
```

In Module Worker mode:

```ts
import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static.module' // <---

const app = new Hono()
//...

export default app
```

wrangler.toml:

```toml
[site]
bucket = "./assets"
```

Asset files:

```
./assets
└── static
    ├── demo
    │   └── index.html
    ├── hello.txt
    └── images
        └── dinotocat.png
```

## Example

<https://github.com/honojs/examples/tree/master/serve-static>
