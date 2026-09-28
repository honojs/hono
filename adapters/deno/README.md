# @hono/deno

Deno adapter for [Hono](https://hono.dev).

```sh
deno add jsr:@hono/deno
```

## Migrating from `hono/deno`

The exports are the same. Change the import path:

```diff
- import { serveStatic } from 'hono/deno'
+ import { serveStatic } from '@hono/deno'
```

`hono/deno` is deprecated and will be removed in Hono v5.

## License

MIT
