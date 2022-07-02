# ETag Middleware

## Usage

index.js:

```js
const app = new Hono()

app.use('/etag/*', etag())
app.get('/etag/abc', (c) => {
  return c.text('Hono is cool')
})

app.fire()
```
