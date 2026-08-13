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

  it('Should support custom replacer function in prettyJSON options', async () => {
    const app = new Hono()
    app.use(
      '*',
      prettyJSON({
        force: true,
        replacer: (key, value) => {
          if (key === 'secret') {
            return undefined
          }
          if (typeof value === 'string') {
            return value.toUpperCase()
          }
          return value
        },
      })
    )
    app.get('/', (c) => {
      return c.json({
        id: 123,
        name: 'hono',
        secret: 'hidden',
      })
    })

    const res = await app.request('http://localhost/')
    expect(await res.text()).toBe(`{
  "id": 123,
  "name": "HONO"
}`)
  })
})
