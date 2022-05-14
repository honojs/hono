import { parseBody } from './body'

describe('Parse Body Middleware', () => {
  it('should parse JSON', async () => {
    const payload = { message: 'hello hono' }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    expect(await parseBody(req)).toEqual(payload)
  })

  it('should parse Text', async () => {
    const payload = 'hello'
    const req = new Request('http://localhost/text', {
      method: 'POST',
      body: 'hello',
      headers: new Headers({ 'Content-Type': 'application/text' }),
    })
    expect(await parseBody(req)).toEqual(payload)
  })

  it('should parse Form', async () => {
    const formData = new URLSearchParams()
    formData.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    expect(await parseBody(req)).toEqual({ message: 'hello' })
  })

  it('should parse Response body ', async () => {
    const payload = 'hello'
    const res = new Response(payload, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    console.log(res.headers.get('Content-Type'))
    expect(await parseBody(res)).toEqual(payload)
  })
})
