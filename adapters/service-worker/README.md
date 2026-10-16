# @hono/service-worker

Service Worker adapter for [Hono](https://hono.dev).

```sh
npm i @hono/service-worker
```

## Migrating from `hono/service-worker`

The exports are the same. Change the import path:

```diff
- import { handle } from 'hono/service-worker'
+ import { handle } from '@hono/service-worker'
```

`hono/service-worker` is deprecated and will be removed in Hono v5.

## License

MIT
