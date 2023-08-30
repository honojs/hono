import { BodyParser } from '.'

describe('Body Parser', () => {
  it('Parse JSON body', async () => {
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify({ 'message[0]': 'Hello Hono', 'message[1]': 'Hello 🔥' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })

    const result = BodyParser.parse(await req.json())
    expect(result).toMatchObject({
      message: ['Hello Hono', 'Hello 🔥'],
    })
  })

  it('Parse URL encoded body', async () => {
    const req = new Request('http://localhost/form', {
      method: 'POST',
      body: new URLSearchParams({
        'message[0]': 'An Array',
        'message[1]': 'Message 🔥',
      }),
      headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    })

    const result = BodyParser.parse(await req.text())

    expect(result).toMatchObject({
      message: ['An Array', 'Message 🔥'],
    })
  })

  it('Parse Text body to JSON', async () => {
    const req = new Request('http://localhost/form', {
      method: 'POST',
      body: 'An Array',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    })

    const result = BodyParser.parse(await req.text())
    expect(result).toMatchObject({
      'An Array': '',
    })
  })
})
