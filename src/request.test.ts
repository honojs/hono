import { HonoRequest } from './request'

describe('Query', () => {
  const rawRequest = new Request('http://localhost?page=2&tag=A&tag=B')
  const req = new HonoRequest(rawRequest)

  test('req.query() and req.queries()', () => {
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
