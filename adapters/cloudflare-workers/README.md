# @hono/cloudflare-workers

Cloudflare Workers adapter for [Hono](https://hono.dev).

```sh
npm i @hono/cloudflare-workers
```

## Migrating from `hono/cloudflare-workers`

The exports are the same. Change the import path:

```diff
- import { serveStatic } from 'hono/cloudflare-workers'
+ import { serveStatic } from '@hono/cloudflare-workers'
```

`hono/cloudflare-workers` is deprecated and will be removed in Hono v5.

## License

MIT
