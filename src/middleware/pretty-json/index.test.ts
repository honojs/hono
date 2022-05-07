import { Hono } from '@/hono'
import { prettyJSON } from '@/middleware/pretty-json'

describe('JSON pretty by Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()

    app.get('/', (c) => {
      return c.json({ message: 'Hono!' })
    })
  })

  it('Should return pretty JSON output', async () => {
    app.use('*', prettyJSON())
    const res = await app.request('http://localhost/?pretty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(`{
  "message": "Hono!"
}`)
  })

  it('Should return pretty JSON output with 4 spaces', async () => {
    app.use('*', prettyJSON({ space: 4 }))
    const res = await app.request('http://localhost/?pretty')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(`{
    "message": "Hono!"
}`)
  })
})
