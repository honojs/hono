# @hono/vercel

Vercel adapter for [Hono](https://hono.dev).

```sh
npm i @hono/vercel
```

## Migrating from `hono/vercel`

The exports are the same. Change the import path:

```diff
- import { handle } from 'hono/vercel'
+ import { handle } from '@hono/vercel'
```

`hono/vercel` is deprecated and will be removed in Hono v5.

## License

MIT
