import { getMimeType } from './mime'

describe('mime', () => {
  it('getMimeType', () => {
    expect(getMimeType('hello.txt')).toBe('text/plain; charset=utf-8')
    expect(getMimeType('hello.html')).toBe('text/html; charset=utf-8')
    expect(getMimeType('hello.json')).toBe('application/json; charset=utf-8')
    expect(getMimeType('good.morning.hello.gif')).toBe('image/gif')
    expect(getMimeType('goodmorninghellogif')).toBeUndefined()
    expect(getMimeType('indexjs.abcd')).toBeUndefined()
  })
})
