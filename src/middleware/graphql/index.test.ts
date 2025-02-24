import { buildSchema } from 'graphql'
import { Hono } from './../../hono'
import { graphql } from './index'

// Define a simple GraphQL schema
const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

// Resolver
const rootValue = {
  hello: () => 'Hello, Hono!',
}

// Create Hono app with GraphQL handler
const app = new Hono()
app.post('/graphql', graphql({ schema, rootValue }))
app.get('/graphql', graphql({ schema, rootValue }))

describe('GraphQL Handler', () => {
  it('should return 405 for non-POST requests', async () => {
    const res = await app.request('http://localhost/graphql', { method: 'GET' })
    expect(res.status).toBe(405)
  })

  it('should return 400 if no query is provided', async () => {
    const res = await app.request('http://localhost/graphql', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.errors[0].message).toBe('Must provide query string.')
  })

  it('should execute a valid query successfully', async () => {
    const res = await app.request('http://localhost/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ hello }' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.hello).toBe('Hello, Hono!')
  })

  it('should return 400 for an invalid query', async () => {
    const res = await app.request('http://localhost/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ invalidField }' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.errors.length).toBeGreaterThan(0)
  })
})
