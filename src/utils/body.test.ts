import { parseBody } from './body'

describe('Parse Body Util', () => {
  it('should parse `multipart/form-data`', async () => {
    const data = new FormData()
    data.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: data,
      // `Content-Type` header must not be set.
    })
    expect(await parseBody(req)).toEqual({ message: 'hello' })
  })

  it('should parse `x-www-form-urlencoded`', async () => {
    const searchParams = new URLSearchParams()
    searchParams.append('message', 'hello')
    const req = new Request('https://localhost/search', {
      method: 'POST',
      body: searchParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    expect(await parseBody(req)).toEqual({ message: 'hello' })
  })

  it('should not parse multiple values in default', async () => {
    const data = new FormData()
    data.append('file', 'aaa')
    data.append('file', 'bbb')
    data.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: data,
    })
    expect(await parseBody(req)).toEqual({
      file: 'bbb',
      message: 'hello',
    })
  })

  it('should parse multiple values if `all` option is true', async () => {
    const data = new FormData()
    data.append('file', 'aaa')
    data.append('file', 'bbb')
    data.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: data,
    })
    expect(await parseBody(req, { all: true })).toEqual({
      file: ['aaa', 'bbb'],
      message: 'hello',
    })
  })

  it('should parse multiple values if key ends with `[]`', async () => {
    const data = new FormData()
    data.append('file[]', 'aaa')
    data.append('file[]', 'bbb')
    data.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: data,
    })
    expect(await parseBody(req, { all: true })).toEqual({
      'file[]': ['aaa', 'bbb'],
      message: 'hello',
    })
  })

  it('should return blank object if body is JSON', async () => {
    const payload = { message: 'hello hono' }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    expect(await parseBody(req)).toEqual({})
  })
})
