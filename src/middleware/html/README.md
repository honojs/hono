# html Middleware

html Middleware provides `html` method for building HTML.

## Usage

index.ts:

```ts
import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

app.get('/:username', (c) => {
  const { username } = c.req.param()
  return c.html(
    html`<!DOCTYPE html>
      <h1>Hello! ${username}!</h1>`
  )
})

app.fire()
```

### Insert snippet into JSX

```typescript
const snippet = html`
  <script async src="https://www.googletagmanager.com/gtag/js?id=MEASUREMENT_ID"></script>
  <script>
    window.dataLayer = window.dataLayer || []
    function gtag() {
      dataLayer.push(arguments)
    }
    gtag('js', new Date())

    gtag('config', 'MEASUREMENT_ID')
  </script>
`

app.get('/', (c) => {
  return c.render(
    <html>
      <head>
        <title>Test Site</title>
        {snippet}
      </head>
      <body>Hello!</body>
    </html>
  )
})
```

### Insert inline script into JSX

```typescript
app.get('/', (c) => {
  return c.render(
    <html>
      <head>
        <title>Test Site</title>
        {html`
          <script>
            // No need to use dangerouslySetInnerHTML. If you write it here, it will not be escaped.
          </script>
        `}
      </head>
      <body>Hello!</body>
    </html>
  )
})
```

### Act as functional component

Since `html` returns an HtmlEscapedString, it can act as a fully functional component without using JSX.

#### Use `html` to speed up the process instead of `memo`

```typescript
const Footer = () => html`
  <footer>
    <address>My Address...</address>
  </footer>
`
```

### Receives props and embeds values

```typescript
interface SiteData {
  title: string
  description: string
  image: string
  children?: any
}
const Layout = (props: SiteData) => html`
<html>
<head>
  <meta charset="UTF-8">
  <title>${props.title}</title>
  <meta name="description" content="${props.description}">
  <head prefix="og: http://ogp.me/ns#">
  <meta property="og:type" content="article">
  <!-- More elements slow down JSX, but not template literals. -->
  <meta property="og:title" content="${props.title}">
  <meta property="og:image" content="${props.image}">
</head>
<body>
  ${props.children}
</body>
</html>
`

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
)

app.get('/', (c) => {
  const props = {
    name: 'World',
    siteData: {
      title: 'Hello <> World',
      description: 'This is a description',
      image: 'https://example.com/image.png',
    },
  }
  return c.render(<Content {...props} />)
})
```

## raw

Using `raw`, the content will be rendered as is. You have to escape these strings by yourself.

```ts
import { html, raw } from 'hono/html'

app.get('/', (c) => {
  const name = 'John &quot;Johnny&quot; Smith'
  return c.html(html`<p>I'm ${raw(name)}.</p>`)
})
```

## Tips

Thanks to these libraries, Visual Studio Code and vim also interprets template literals as HTML, allowing syntax highlighting and formatting to be applied.

- <https://marketplace.visualstudio.com/items?itemName=bierner.lit-html>
- <https://github.com/MaxMEllon/vim-jsx-pretty>
