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

  it('should return blank object if body is JSON', async () => {
    const payload = { message: 'hello hono' }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    expect(await parseBody(req)).toEqual({})
  })

  it('should correctly parse multipart/form-data from ArrayBuffer', async () => {
    const dummyRequest = new Request('http://localhost', {
      method: 'POST',
      headers: [['Content-Type', 'multipart/form-data; boundary=sampleboundary']],
      body: new FormData(),
    })

    const encoder = new TextEncoder()
    const testData =
      '--sampleboundary\r\nContent-Disposition: form-data; name="test"\r\n\r\nHello\r\n--sampleboundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await parseBody(dummyRequest, arrayBuffer)

    expect(result).toEqual({ test: 'Hello' })
  })

  it('should correctly parse application/x-www-form-urlencoded from ArrayBuffer', async () => {
    const dummyRequest = new Request('http://localhost', {
      method: 'POST',
      headers: [['Content-Type', 'application/x-www-form-urlencoded']],
      body: new FormData(),
    })

    const encoder = new TextEncoder()
    const testData = 'key1=value1&key2=value2'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await parseBody(dummyRequest, arrayBuffer)

    expect(result).toEqual({ key1: 'value1', key2: 'value2' })
  })
})
