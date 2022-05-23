import { Hono } from '../../hono'
import { prettyJSON } from '.'

describe('JSON pretty by Middleware', () => {
  const app = new Hono()

  it('Should return pretty JSON output', async () => {
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
})
