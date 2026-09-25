# @hono/bun

Bun adapter for [Hono](https://hono.dev).

```sh
bun add @hono/bun
```

## Migrating from `hono/bun`

The exports are the same. Change the import path:

```diff
- import { serveStatic } from 'hono/bun'
+ import { serveStatic } from '@hono/bun'
```

`hono/bun` is deprecated and will be removed in Hono v5.

## License

MIT
