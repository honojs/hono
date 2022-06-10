# JSX Middleware

JSX Middleware enable rendering HTML with JSX syntax.
It's just for Sever-Side-Rendering. No virtual DOM.
This middleware supports only for TypeScript.

## Settings

tsconfig.json:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

## Usage

index.tsx:

```tsx
import { Hono } from 'hono'
import { h, jsx } from 'hono/jsx'

const app = new Hono()

app.use('*', jsx())

const Layout = (props: { children?: string }) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

const Top = (props: { messages: string[] }) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

app.get('/', (c) => {
  const messages = ['Good Morning', 'Good Evening', 'Good Night']
  return c.render(<Top messages={messages} />)
})

app.fire()
```

## dangerouslySetInnerHTML

```tsx
app.get('/foo', (c) => {
  const html = { __html: 'JSX &middot; SSR' }
  return c.render(<div dangerouslySetInnerHTML={html} />)
})
```

## Tips for Cloudflare Workers

It's useful to use Miniflare's`live-reload` option for developing.

package.json:

```json
{
  "scripts": {
    "build": "esbuild --bundle --outdir=dist ./src/index.tsx",
    "dev": "miniflare --live-reload --debug"
  }
}
```

wrangler.toml:

```toml
command = "yarn run build"
```
