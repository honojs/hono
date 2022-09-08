import { JSONPath } from './json'

describe('JSONPath', () => {
  const data = {
    post: {
      title: 'Hello',
      author: {
        name: 'Superman',
        age: 20,
      },
      tags: ['foo', 'bar', { framework: 'Hono' }],
    },
  }

  it('Should return the string or number pointed by JSON Path', () => {
    expect(JSONPath(data, 'post.title')).toBe('Hello')
    expect(JSONPath(data, 'post.author.name')).toBe('Superman')
    expect(JSONPath(data, 'post.author.age')).toBe(20)
    expect(JSONPath(data, 'post.tags.0')).toBe('foo')
    expect(JSONPath(data, 'post.tags.1')).toBe('bar')
    expect(JSONPath(data, 'post.tags.2.framework')).toBe('Hono')
  })

  it('Should return undefined', () => {
    expect(JSONPath(data, 'post.foo')).toBe(undefined)
    expect(JSONPath(data, 'post.author.foo')).toBe(undefined)
    expect(JSONPath(data, 'post.tags.3')).toBe(undefined)
  })

  it('Should return objects pointed by JSON Path', () => {
    expect(typeof JSONPath(data, 'post')).toBe('object')
    expect(JSONPath(data, 'post.author')).toEqual({ name: 'Superman', age: 20 })
    expect(JSONPath(data, 'post.tags').length).toBe(3)
  })
})
