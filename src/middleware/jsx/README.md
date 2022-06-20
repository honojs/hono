# JSX Middleware

JSX Middleware enable rendering HTML with JSX syntax.
It's just for Sever-Side-Rendering. No virtual DOM.
This middleware is only for writing with TypeScript.

## Settings

tsconfig.json:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "jsx",
    "jsxFragmentFactory": "Fragment"
  }
}
```

## Usage

index.tsx:

```tsx
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'

const app = new Hono()

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
  return c.html(<Top messages={messages} />)
})

app.fire()
```

## dangerouslySetInnerHTML

`dangerouslySetInnerHTML` allows you to set HTML directly.

```tsx
app.get('/foo', (c) => {
  const inner = { __html: 'JSX &middot; SSR' }
  const Div = <div dangerouslySetInnerHTML={inner} />
})
```

## memo

You can memorize calculated strings of the component with `memo`.

```tsx
import { jsx, memo } from 'hono/jsx'

const Header = memo(() => <header>Welcome to Hono</header>)
const Footer = memo(() => <footer>Powered by Hono</footer>)
const Layout = (
  <div>
    <Header />
    <p>Hono is cool!</p>
    <Footer />
  </div>
)
```

## Fragment

```tsx
import { jsx, Fragment } from 'hono/jsx'

const List = () => (
  <Fragment>
    <p>first child</p>
    <p>second child</p>
    <p>third child</p>
  </Fragment>
)
```

## With html Middleware

It's powerful to use JSX middleware with html middleware.
For more information, see [html middleware docs](https://github.com/honojs/hono/tree/master/src/middleware/html).

```tsx
import { Hono } from 'hono'
import { html } from 'hono/html'
import { jsx } from 'hono/jsx'

const app = new Hono()

interface SiteData {
  title: string
  children?: any
}

const Layout = (props: SiteData) => html`<!DOCTYPE html>
  <html>
    <head>
      <title>${props.title}</title>
    </head>
    <body>
      ${props.children}
    </body>
  </html>`

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
)

app.get('/:name', (c) => {
  const { name } = c.req.param()
  const props = {
    name: name,
    siteData: {
      title: 'JSX with html sample',
    },
  }
  return c.html(<Content {...props} />)
})

app.fire()
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
[build]
command = "yarn build"
```
