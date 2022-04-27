# Serve Static Middleware

Mustache Middleware is available only on Cloudflare Workers.

## Usage

index.js:

```js
import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

app.fire()
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
