import { HonoRequest } from './request'

const rawRequest = new Request('http://localhost')

describe('req.addValidatedData() and req.data()', () => {
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

  test('append data - json', () => {
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
      title: 'hello',
      author: {
        name: 'young man',
        age: 20,
        tall: 170,
      },
      tag: ['sport', 'music'],
    })
  })

  test('req.data() with no argument', () => {
    const req = new HonoRequest(rawRequest)
    req.addValidatedData('query', { page: '123', q: 'foo' })
    req.addValidatedData('json', payload)
    const data = req.valid()
    expect(data).toEqual({
      page: '123',
      q: 'foo',
      title: 'hello',
      author: {
        name: 'young man',
        age: 20,
      },
    })
  })
})
