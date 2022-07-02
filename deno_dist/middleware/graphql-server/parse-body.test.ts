import { parseBody } from './parse-body.ts'

describe('parseBody', () => {
  it('Should return a blank JSON object', async () => {
    const req = new Request('http://localhost/graphql')
    const res = await parseBody(req)
    expect(res).toEqual({})
  })

  it('With Content-Type: application/graphql', async () => {
    const req = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
      },
      body: 'query { hello }',
    })
    const res = await parseBody(req)
    expect(res).toEqual({ query: 'query { hello }' })
  })

  it('With Content-Type: application/json', async () => {
    const variables = JSON.stringify({ who: 'Dolly' })
    const req = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query { hello }',
        variables: variables,
      }),
    })
    const res = await parseBody(req)
    expect(res).toEqual({
      query: 'query { hello }',
      variables: variables,
    })
  })

  it('With Content-Type: application/x-www-form-urlencoded', async () => {
    const variables = JSON.stringify({ who: 'Dolly' })

    const searchParams = new URLSearchParams()
    searchParams.append('query', 'query { hello }')
    searchParams.append('variables', variables)
    const req = new Request('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: searchParams.toString(),
    })
    const res = await parseBody(req)

    expect(res).toEqual({
      query: 'query { hello }',
      variables: variables,
    })
  })
})
