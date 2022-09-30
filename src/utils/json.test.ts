import type { JSONArray } from './json'
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
    relatedPosts: [
      {
        title: 'HelloWorld',
        author: {
          name: 'The Flash',
          age: 32,
        },
        tags: ['flash', 'marvel'],
      },
      {
        title: 'Hello World',
        author: {
          name: 'Spiderman',
          age: 26,
        },
        tags: ['spider', 'man'],
      },
      {
        title: 'World. Hello!',
        author: {
          name: 'Batman',
          age: 45,
        },
        tags: ['bat', 'man'],
      },
    ],
    releases: [
      {
        code: 'buster',
        amd64: true,
      },
      {
        code: 'stretch',
        amd64: true,
      },
      {
        code: 'potato',
      },
    ],
    nestedArray: [[[1]]],
  }

  it('Should return the string or number pointed by JSON Path', () => {
    expect(JSONPath(data, 'post.title')).toBe('Hello')
    expect(JSONPath(data, 'post.author.name')).toBe('Superman')
    expect(JSONPath(data, 'post.author.age')).toBe(20)
    expect(JSONPath(data, 'post.tags.0')).toBe('foo')
    expect(JSONPath(data, 'post.tags[0]')).toBe('foo')
    expect(JSONPath(data, 'post.tags.1')).toBe('bar')
    expect(JSONPath(data, 'post.tags[1]')).toBe('bar')
    expect(JSONPath(data, 'post.tags.2.framework')).toBe('Hono')
    expect(JSONPath(data, 'post.tags[2].framework')).toBe('Hono')
  })

  it('Should return undefined', () => {
    expect(JSONPath(data, 'post.foo')).toBe(undefined)
    expect(JSONPath(data, 'post.author.foo')).toBe(undefined)
    expect(JSONPath(data, 'post.tags.3')).toBe(undefined)
    expect(JSONPath(data, 'post.tags[3]')).toBe(undefined)
  })

  it('Should return objects pointed by JSON Path', () => {
    expect(typeof JSONPath(data, 'post')).toBe('object')
    expect(JSONPath(data, 'post.author')).toEqual({ name: 'Superman', age: 20 })
    expect((JSONPath(data, 'post.tags') as JSONArray).length).toBe(3)
  })

  it('Should return values of object as array', () => {
    expect(JSONPath(data, 'post.author[*]')).toEqual(['Superman', 20])
  })

  it('Should return an array when targeting fields in arrays of objects', () => {
    expect(Array.isArray(JSONPath(data, 'relatedPosts[*].title'))).toBe(true)
    expect(JSONPath(data, 'relatedPosts[*].title')).toEqual([
      'HelloWorld',
      'Hello World',
      'World. Hello!',
    ])
  })

  it('Should return all deeply nested JSON path results', () => {
    expect(Array.isArray(JSONPath(data, 'relatedPosts[*].tags[*]'))).toBe(true)
    expect(JSONPath(data, 'relatedPosts[*].tags[*]')).toEqual([
      'flash',
      'marvel',
      'spider',
      'man',
      'bat',
      'man',
    ])
    expect(JSONPath(data, 'relatedPosts[*].tags[1]')).toEqual(['marvel', 'man', 'man'])
  })

  it('Should return only the data that exist if only some of the data have values.', () => {
    expect(JSONPath(data, 'releases[*].amd64')).toEqual([true, true])
  })

  it('Should return undefined if there is no matching path.', () => {
    expect(JSONPath(data, 'post.category')).toEqual(undefined)
  })

  it('Should return array of undefined if there is no matching path within array', () => {
    expect(JSONPath(data, 'releases[*].i386')).toEqual([undefined, undefined, undefined])
  })

  it('Should return value from nested array', () => {
    expect(JSONPath(data, 'nestedArray.0.0.0')).toBe(1)
    expect(JSONPath(data, 'nestedArray[0][0][0]')).toBe(1)
  })
})
