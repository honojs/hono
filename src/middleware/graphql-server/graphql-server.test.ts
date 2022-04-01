import { Hono } from '../../hono'
import { errorMessages, graphqlServer } from './graphql-server'
import {
  buildSchema,
  GraphQLSchema,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNonNull,
} from 'graphql'

describe('errorMessages', () => {
  const messages = errorMessages(['message a', 'message b'])
  expect(messages).toEqual({
    errors: [
      {
        message: 'message a',
      },
      {
        message: 'message b',
      },
    ],
  })
})

describe('GraphQL Middleware - Simple way', () => {
  // Construct a schema, using GraphQL schema language
  const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

  // The root provides a resolver function for each API endpoint
  const rootValue = {
    hello: () => 'Hello world!',
  }

  const app = new Hono()
  app.use(
    '/graphql',
    graphqlServer({
      schema,
      rootValue,
    })
  )

  it('Should return GraphQL response', async () => {
    const query = 'query { hello }'
    const body = {
      query: query,
    }

    const res = await app.request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"hello":"Hello world!"}}')
  })
})

const QueryRootType = new GraphQLObjectType({
  name: 'QueryRoot',
  fields: {
    test: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, args: { who?: string }) => 'Hello ' + (args.who ?? 'World'),
    },
    thrower: {
      type: GraphQLString,
      resolve() {
        throw new Error('Throws!')
      },
    },
  },
})

const TestSchema = new GraphQLSchema({
  query: QueryRootType,
  mutation: new GraphQLObjectType({
    name: 'MutationRoot',
    fields: {
      writeTest: {
        type: QueryRootType,
        resolve: () => ({}),
      },
    },
  }),
})

const urlString = (query?: Record<string, string>): string => {
  const base = 'http://localhost/graphql'
  if (!query) return base
  const queryString = new URLSearchParams(query).toString()
  return `${base}?${queryString}`
}

describe('GraphQL Middleware - GET functionality', () => {
  const app = new Hono()
  app.use(
    '/graphql',
    graphqlServer({
      schema: TestSchema,
    })
  )

  it('Allows GET with variable values', async () => {
    const query = {
      query: 'query helloWho($who: String){ test(who: $who) }',
      variables: JSON.stringify({ who: 'Dolly' }),
    }

    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Allows GET with operation name', async () => {
    const query = {
      query: `
        query helloYou { test(who: "You"), ...shared }
        query helloWorld { test(who: "World"), ...shared }
        query helloDolly { test(who: "Dolly"), ...shared }
        fragment shared on QueryRoot {
          shared: test(who: "Everyone")
        }
      `,
      operationName: 'helloWorld',
    }

    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      data: {
        test: 'Hello World',
        shared: 'Hello Everyone',
      },
    })
  })

  it('Reports validation errors', async () => {
    const query = { query: '{ test, unknownOne, unknownTwo }' }
    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(400)
  })

  it('Errors when missing operation name', async () => {
    const query = {
      query: `
          query TestQuery { test }
          mutation TestMutation { writeTest { test } }
        `,
    }
    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(500)
  })

  it('Errors when sending a mutation via GET', async () => {
    const query = {
      query: 'mutation TestMutation { writeTest { test } }',
    }
    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(405)
  })

  it('Errors when selecting a mutation within a GET', async () => {
    const query = {
      operationName: 'TestMutation',
      query: `
          query TestQuery { test }
          mutation TestMutation { writeTest { test } }
        `,
    }
    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(405)
  })

  it('Allows a mutation to exist within a GET', async () => {
    const query = {
      operationName: 'TestQuery',
      query: `
          mutation TestMutation { writeTest { test } }
          query TestQuery { test }
        `,
    }
    const res = await app.request(urlString(query), {
      method: 'GET',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      data: {
        test: 'Hello World',
      },
    })
  })
})

describe('GraphQL Middleware - POST functionality', () => {
  const app = new Hono()
  app.use(
    '/graphql',
    graphqlServer({
      schema: TestSchema,
    })
  )

  it('Allows POST with JSON encoding', async () => {
    const query = { query: '{test}' }

    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello World"}}')
  })

  it('Allows sending a mutation via POST', async () => {
    const query = { query: 'mutation TestMutation { writeTest { test } }' }
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"writeTest":{"test":"Hello World"}}}')
  })

  it('Allows POST with url encoding', async () => {
    const query = {
      query: '{test}',
    }
    const res = await app.request(urlString(query), {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello World"}}')
  })

  it('Supports POST JSON query with string variables', async () => {
    const query = {
      query: 'query helloWho($who: String){ test(who: $who) }',
      variables: JSON.stringify({ who: 'Dolly' }),
    }
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Supports POST url encoded query with string variables', async () => {
    const searchParams = new URLSearchParams({
      query: 'query helloWho($who: String){ test(who: $who) }',
      variables: JSON.stringify({ who: 'Dolly' }),
    })
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: searchParams.toString(),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Supports POST JSON query with GET variable values', async () => {
    const variables = {
      variables: JSON.stringify({ who: 'Dolly' }),
    }
    const query = { query: 'query helloWho($who: String){ test(who: $who) }' }
    const res = await app.request(urlString(variables), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Supports POST url encoded query with GET variable values', async () => {
    const searchParams = new URLSearchParams({
      query: 'query helloWho($who: String){ test(who: $who) }',
    })
    const variables = {
      variables: JSON.stringify({ who: 'Dolly' }),
    }
    const res = await app.request(urlString(variables), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: searchParams.toString(),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Supports POST raw text query with GET variable values', async () => {
    const variables = {
      variables: JSON.stringify({ who: 'Dolly' }),
    }
    const res = await app.request(urlString(variables), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
      },
      body: 'query helloWho($who: String){ test(who: $who) }',
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"data":{"test":"Hello Dolly"}}')
  })

  it('Allows POST with operation name', async () => {
    const query = {
      query: `
        query helloYou { test(who: "You"), ...shared }
        query helloWorld { test(who: "World"), ...shared }
        query helloDolly { test(who: "Dolly"), ...shared }
        fragment shared on QueryRoot {
          shared: test(who: "Everyone")
        }
      `,
      operationName: 'helloWorld',
    }
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      data: {
        test: 'Hello World',
        shared: 'Hello Everyone',
      },
    })
  })

  it('Allows POST with GET operation name', async () => {
    const res = await app.request(
      urlString({
        operationName: 'helloWorld',
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/graphql',
        },
        body: `
      query helloYou { test(who: "You"), ...shared }
      query helloWorld { test(who: "World"), ...shared }
      query helloDolly { test(who: "Dolly"), ...shared }
      fragment shared on QueryRoot {
        shared: test(who: "Everyone")
      }
    `,
      }
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      data: {
        test: 'Hello World',
        shared: 'Hello Everyone',
      },
    })
  })
})

describe('Pretty printing', () => {
  it('Supports pretty printing', async () => {
    const app = new Hono()

    app.use(
      '/graphql',
      graphqlServer({
        schema: TestSchema,
        pretty: true,
      })
    )

    const res = await app.request(urlString({ query: '{test}' }))
    expect(await res.text()).toEqual(
      [
        // Pretty printed JSON
        '{',
        '  "data": {',
        '    "test": "Hello World"',
        '  }',
        '}',
      ].join('\n')
    )
  })
})

describe('Error handling functionality', () => {
  const app = new Hono()
  app.use(
    '/graphql',
    graphqlServer({
      schema: TestSchema,
    })
  )

  it('Handles query errors from non-null top field errors', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {
            type: new GraphQLNonNull(GraphQLString),
            resolve() {
              throw new Error('Throws!')
            },
          },
        },
      }),
    })
    const app = new Hono()

    app.use('/graphql', graphqlServer({ schema }))

    const res = await app.request(
      urlString({
        query: '{ test }',
      })
    )

    expect(res.status).toBe(500)
  })

  it('Handles syntax errors caught by GraphQL', async () => {
    const res = await app.request(
      urlString({
        query: 'syntax_error',
      }),
      {
        method: 'GET',
      }
    )

    expect(res.status).toBe(400)
  })

  it('Handles errors caused by a lack of query', async () => {
    const res = await app.request(urlString(), {
      method: 'GET',
    })

    expect(res.status).toBe(400)
  })

  it('Handles invalid JSON bodies', async () => {
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    })

    expect(res.status).toBe(400)
  })

  it('Handles incomplete JSON bodies', async () => {
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"query":',
    })
    expect(res.status).toBe(400)
  })

  it('Handles plain POST text', async () => {
    const res = await app.request(
      urlString({
        variables: JSON.stringify({ who: 'Dolly' }),
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'query helloWho($who: String){ test(who: $who) }',
      }
    )
    expect(res.status).toBe(400)
  })

  it('Handles poorly formed variables', async () => {
    const res = await app.request(
      urlString({
        variables: 'who:You',
        query: 'query helloWho($who: String){ test(who: $who) }',
      }),
      {
        method: 'GET',
      }
    )
    expect(res.status).toBe(400)
  })

  it('Handles invalid variables', async () => {
    const res = await app.request(urlString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query helloWho($who: String){ test(who: $who) }',
        variables: { who: ['John', 'Jane'] },
      }),
    })
    expect(res.status).toBe(500)
  })

  it('Handles unsupported HTTP methods', async () => {
    const res = await app.request(urlString({ query: '{test}' }), {
      method: 'PUT',
    })

    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, POST')
    expect(await res.json()).toEqual({
      errors: [{ message: 'GraphQL only supports GET and POST requests.' }],
    })
  })
})
