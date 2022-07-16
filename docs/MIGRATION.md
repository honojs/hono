# Migration Guide

## v1.6.4 to v2.0.0

There are many BREAKING CHANGES. Please follow instructions below.

### The way to import Middleware on Deno has been changed

**DO NOT** import middleware from `hono/mod.ts`.

```ts
import { Hono, poweredBy } from 'https://deno.land/x/hono/mod.ts' // <--- NG
```

`hono/mod.ts` does not export middleware.
To import middleware, use `hono/middleware.ts`:

```ts
import { Hono } from 'https://deno.land/x/hono/mod.ts'
import { poweredBy, basicAuth } from 'https://deno.land/x/hono/middleware.ts'
```

### Cookie middleware is obsolete

**DO NOT** use `cookie` middleware.

```ts
import { cookie } from 'hono/cookie' // <--- Obsolete!
```

You do not have to use Cookie middleware to parse or set cookies.
They become default functions:

```ts
// Parse cookie
app.get('/entry/:id', (c) => {
  const value = c.req.cookie('name')
  ...
})
```

```ts
app.get('/', (c) => {
  c.cookie('delicious_cookie', 'choco')
  return c.text('Do you like cookie?')
})
```

### Body parse middleware is obsolete

**DO NOT** use `body-parse` middleware.

```ts
import { bodyParse } from 'hono/body-parse' // <--- Obsolete!
```

You do not have to use Body parse middleware to parse request body. Use `c.req.parseBody()` method instead.

```ts
// Parse Request body
 app.post('', (c) => {
   const body = c.req.parseBody()
   ...
 })
```

### GraphQL Server middleware is obsolete

**DO NOT** use `graphql-server` middleware.

```ts
import { graphqlServer } from 'hono/graphql-server' // <--- Obsolete!
```

It might be distributed as third-party middleware.

### Mustache middleware is obsolete

**DO NOT** use `mustache` middleware.

```ts
import { mustache } from 'hono/mustache' // <--- Obsolete!
```

It will no longer be implemented.
