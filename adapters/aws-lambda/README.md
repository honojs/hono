# @hono/aws-lambda

AWS Lambda adapter for [Hono](https://hono.dev).

```sh
npm i @hono/aws-lambda
```

## Migrating from `hono/aws-lambda`

The exports are the same. Change the import path:

```diff
- import { handle } from 'hono/aws-lambda'
+ import { handle } from '@hono/aws-lambda'
```

`hono/aws-lambda` is deprecated and will be removed in Hono v5.

## License

MIT
