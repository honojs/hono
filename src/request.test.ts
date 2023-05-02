import { HonoRequest } from './request'

describe('Query', () => {
  test('req.query() and req.queries()', () => {
    const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
    const req = new HonoRequest(rawRequest)

    const page = req.query('page')
    expect(page).not.toBeUndefined()
    expect(page).toBe('2')

    const q = req.query('q')
    expect(q).toBeUndefined()

    const tags = req.queries('tag')
    expect(tags).not.toBeUndefined()
    expect(tags).toEqual(['A', 'B'])

    const q2 = req.queries('q2')
    expect(q2).toBeUndefined()
  })

  test('decode special chars', () => {
    const rawRequest = new Request('http://localhost?mail=framework%40hono.dev&tag=%401&tag=%402')
    const req = new HonoRequest(rawRequest)

    const mail = req.query('mail')
    expect(mail).toBe('framework@hono.dev')

    const tags = req.queries('tag')
    expect(tags).toEqual(['@1', '@2'])
  })
})

describe('req.addValidatedData() and req.data()', () => {
  const rawRequest = new Request('http://localhost')

  const payload = {
    title: 'hello',
    author: {
      name: 'young man',
      age: 20,
    },
  }

  test('add data - json', () => {
    const req = new HonoRequest(rawRequest)
    req.addValidatedData('json', payload)
    const data = req.valid('json')
    expect(data).toEqual(payload)
  })

  test('replace data - json', () => {
    const req = new HonoRequest(rawRequest)
    req.addValidatedData('json', payload)
    req.addValidatedData('json', {
      tag: ['sport', 'music'],
      author: {
        tall: 170,
      },
    })
    const data = req.valid('json')
    expect(data).toEqual({
      author: {
        tall: 170,
      },
      tag: ['sport', 'music'],
    })
  })
})

describe('headers', () => {
  test('empty string is a valid header value', () => {
    const req = new HonoRequest(new Request('http://localhost', { headers: { foo: '' } }))
    const foo = req.header('foo')
    expect(foo).toEqual('')
  })
})
