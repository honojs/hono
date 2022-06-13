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
  return c.htm(<Top messages={messages} />)
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
