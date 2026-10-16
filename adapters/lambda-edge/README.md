# @hono/lambda-edge

Lambda@Edge adapter for [Hono](https://hono.dev).

```sh
npm i @hono/lambda-edge
```

## Migrating from `hono/lambda-edge`

The exports are the same. Change the import path:

```diff
- import { handle } from 'hono/lambda-edge'
+ import { handle } from '@hono/lambda-edge'
```

`hono/lambda-edge` is deprecated and will be removed in Hono v5.

## License

MIT
