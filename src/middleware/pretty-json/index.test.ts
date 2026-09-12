import { Hono } from '../../hono'
import { prettyJSON } from '.'

describe('JSON pretty by Middleware', () => {
  it('Should return pretty JSON output', async () => {
    const app = new Hono()
    app.use('*', prettyJSON())
    app.get('/', (c) => {
      return c.json({ message: 'Hono!' })
    })

    const res = await app.request('http://localhost/?pretty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(`{
  "message": "Hono!"
}`)
  })

  it('Should return pretty JSON output with 4 spaces', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ space: 4 }))
    app.get('/', (c) => {
      return c.json({ message: 'Hono!' })
    })

    const res = await app.request('http://localhost/?pretty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(`{
    "message": "Hono!"
}`)
  })

  it('Should return pretty JSON output when middleware received custom query', async () => {
    const targetQuery = 'format'

    const app = new Hono()
    app.use(
      '*',
      prettyJSON({
        query: targetQuery,
      })
    )
    app.get('/', (c) =>
      c.json({
        message: 'Hono!',
      })
    )

    const prettyText = await (await app.request(`?${targetQuery}`)).text()
    expect(prettyText).toBe(`{
  "message": "Hono!"
}`)
    const nonPrettyText = await (await app.request('?pretty')).text()
    expect(nonPrettyText).toBe('{"message":"Hono!"}')
  })

  it('Should force pretty JSON output when force option is true', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get('/', (c) => {
      return c.json({ message: 'Hono!' })
    })

    const resWithoutQuery = await (await app.request('http://localhost/')).text()
    expect(resWithoutQuery).toBe(`{
  "message": "Hono!"
}`)

    const resWithQuery = await (await app.request('http://localhost/?pretty')).text()
    expect(resWithQuery).toBe(`{
  "message": "Hono!"
}`)
  })

  it('Should return pretty JSON output for structured JSON content-types (+json)', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get('/problem', (c) => {
      return c.newResponse(JSON.stringify({ type: 'about:blank', title: 'Bad Request' }), 400, {
        'Content-Type': 'application/problem+json',
      })
    })
    app.get('/jsonapi', (c) => {
      return c.newResponse(JSON.stringify({ data: { id: '1', type: 'articles' } }), 200, {
        'Content-Type': 'application/vnd.api+json',
      })
    })

    const problemRes = await app.request('http://localhost/problem')
    expect(await problemRes.text()).toBe(`{
  "type": "about:blank",
  "title": "Bad Request"
}`)

    const jsonApiRes = await app.request('http://localhost/jsonapi')
    expect(await jsonApiRes.text()).toBe(`{
  "data": {
    "id": "1",
    "type": "articles"
  }
}`)
  })

  it('Should not touch responses with non-JSON content-types', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get('/text', (c) => c.text('{"message":"Hono!"}'))
    app.get('/json-seq', (c) => {
      return c.body('{"message":"Hono!"}', 200, {
        'Content-Type': 'application/json-seq',
      })
    })

    const textRes = await app.request('http://localhost/text')
    expect(await textRes.text()).toBe('{"message":"Hono!"}')

    const jsonSeqRes = await app.request('http://localhost/json-seq')
    expect(await jsonSeqRes.text()).toBe('{"message":"Hono!"}')
  })

  it('Should not break 204 responses with a JSON content-type', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.delete('/x', (c) => {
      c.header('Content-Type', 'application/json')
      return c.body(null, 204)
    })

    const res = await app.request('http://localhost/x', { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })

  it('Should not break 304 responses with a JSON content-type', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get('/x', (c) => {
      c.header('Content-Type', 'application/json')
      return c.body(null, 304)
    })

    const res = await app.request('http://localhost/x')
    expect(res.status).toBe(304)
    expect(res.body).toBeNull()
  })

  it('Should not break empty responses with a JSON content-type', async () => {
    const app = new Hono()
    app.use('*', prettyJSON())
    app.get('/x', () => new Response('', { headers: { 'Content-Type': 'application/json' } }))

    const res = await app.request('http://localhost/x?pretty')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
  })

  it('Should pass through a response with an invalid JSON body unchanged', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get(
      '/x',
      () =>
        new Response('not json', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Custom': 'custom', ETag: '"abc"' },
        })
    )

    const res = await app.request('http://localhost/x')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Custom')).toBe('custom')
    expect(res.headers.get('ETag')).toBe('"abc"')
    expect(await res.text()).toBe('not json')
  })

  it('Should not break a response whose body was already consumed', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.use('*', async (c, next) => {
      await next()
      await c.res.text()
    })
    app.get('/x', (c) => c.json({ message: 'Hono!' }))

    // The body is consumed by the middleware above, so only the status is asserted here
    const res = await app.request('http://localhost/x')
    expect(res.status).toBe(200)
  })

  it('Should remove a stale Content-Length when the body is prettified', async () => {
    const app = new Hono()
    app.use('*', prettyJSON({ force: true }))
    app.get(
      '/x',
      () =>
        new Response('{"message":"Hono!"}', {
          headers: { 'Content-Type': 'application/json', 'Content-Length': '21' },
        })
    )

    const res = await app.request('http://localhost/x')
    expect(await res.text()).toBe(`{
  "message": "Hono!"
}`)
    expect(res.headers.get('Content-Length')).toBeNull()
  })
})
