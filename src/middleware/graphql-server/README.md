# GraphQL Server Middleware

## Requirements

This middleware depends on [GraphQL.js](https://www.npmjs.com/package/graphql).

```plain
npm i graphql
```

or

```plain
yarn add graphql
```

## Usage

index.js:

```js
import { Hono } from 'hono'
import { graphqlServer } from 'hono/graphql-server'
import { buildSchema } from 'graphql'

export const app = new Hono()

const schema = buildSchema(`
type Query {
  hello: String
}
`)

const rootValue = {
  hello: () => 'Hello Hono!',
}

app.use(
  '/graphql',
  graphqlServer({
    schema,
    rootValue,
  })
)

app.fire()
```
