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
})
