# Middleware

The full middleware guide is on [hono.dev](https://hono.dev/docs/guides/middleware).

## Example

```ts
app.use(async (_, next) => {
  console.log('middleware 1 start')
  await next()
  console.log('middleware 1 end')
})
app.use(async (_, next) => {
  console.log('middleware 2 start')
  await next()
  console.log('middleware 2 end')
})
app.use(async (_, next) => {
  console.log('middleware 3 start')
  await next()
  console.log('middleware 3 end')
})

app.get('/', (c) => {
  console.log('handler')
  return c.text('Hello!')
})
```

## Execution order

Middleware runs in an onion model. Code **before** `await next()` runs in the order you register middleware (first registered first). The handler runs at the center. Code **after** `await next()` runs in reverse registration order (last registered first).

```
Request → MW1 → MW2 → MW3 → Handler → MW3 → MW2 → MW1 → Response
```

For the example above, `console.log` runs in this order:

1. `middleware 1 start`
2. `middleware 2 start`
3. `middleware 3 start`
4. `handler`
5. `middleware 3 end`
6. `middleware 2 end`
7. `middleware 1 end`

When several middleware are registered for a route (for example `logger()`, then `cors()`, then `basicAuth()`), the same rule applies: they run in registration order before the handler, and in reverse order after the response is produced.
