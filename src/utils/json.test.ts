import type { JSONArray } from './json'
import { JSONPathCopy } from './json'

describe('JSONPathCopy', () => {
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
    const dst = {}
    expect(JSONPathCopy(data, dst, 'post.title')).toBe('Hello')
    expect(JSONPathCopy(data, dst, 'post.author.name')).toBe('Superman')
    expect(JSONPathCopy(data, dst, 'post.author.age')).toBe(20)
    expect(JSONPathCopy(data, dst, 'post.tags.0')).toBe('foo')
    expect(JSONPathCopy(data, dst, 'post.tags[0]')).toBe('foo')
    expect(JSONPathCopy(data, dst, 'post.tags.1')).toBe('bar')
    expect(JSONPathCopy(data, dst, 'post.tags[1]')).toBe('bar')
    expect(JSONPathCopy(data, dst, 'post.tags.2.framework')).toBe('Hono')
    expect(JSONPathCopy(data, dst, 'post.tags[2].framework')).toBe('Hono')
    expect(dst).toEqual({
      post: {
        title: 'Hello',
        author: {
          name: 'Superman',
          age: 20,
        },
        tags: ['foo', 'bar', { framework: 'Hono' }],
      },
    })
  })

  it('Should return undefined', () => {
    const dst = {}
    expect(JSONPathCopy(data, dst, 'post.foo')).toBe(undefined)
    expect(JSONPathCopy(data, dst, 'post.author.foo')).toBe(undefined)
    expect(JSONPathCopy(data, dst, 'post.tags.3')).toBe(undefined)
    expect(JSONPathCopy(data, dst, 'post.tags[3]')).toBe(undefined)
    expect(dst).toEqual({ post: { author: {}, tags: [] } })
  })

  it('Should return objects pointed by JSON Path', () => {
    const dst = {}
    expect(typeof JSONPathCopy(data, dst, 'post')).toBe('object')
    expect(JSONPathCopy(data, dst, 'post.author')).toEqual({ name: 'Superman', age: 20 })
    expect((JSONPathCopy(data, dst, 'post.tags') as JSONArray).length).toBe(3)
  })

  it('Should return values of object as array', () => {
    const dst = {}
    expect(JSONPathCopy(data, dst, 'post.author[*]')).toEqual(['Superman', 20])
    expect(dst).toEqual({
      post: {
        author: {
          name: 'Superman',
          age: 20,
        },
      },
    })
    expect(JSONPathCopy(data, dst, 'post.author.[*]')).toEqual(['Superman', 20])
  })

  it('Should return an array when targeting fields in arrays of objects', () => {
    const dst = {}
    expect(Array.isArray(JSONPathCopy(data, dst, 'relatedPosts[*].title'))).toBe(true)
    expect(JSONPathCopy(data, dst, 'relatedPosts[*].title')).toEqual([
      'HelloWorld',
      'Hello World',
      'World. Hello!',
    ])
    expect(dst).toEqual({
      relatedPosts: [{ title: 'HelloWorld' }, { title: 'Hello World' }, { title: 'World. Hello!' }],
    })
  })

  it('Should return all deeply nested JSON path results', () => {
    let dst = {}
    expect(Array.isArray(JSONPathCopy(data, dst, 'relatedPosts[*].tags[*]'))).toBe(true)
    expect(dst).toEqual({
      relatedPosts: [
        { tags: ['flash', 'marvel'] },
        { tags: ['spider', 'man'] },
        { tags: ['bat', 'man'] },
      ],
    })
    dst = {}
    expect(JSONPathCopy(data, dst, 'relatedPosts[*].tags[*]')).toEqual([
      'flash',
      'marvel',
      'spider',
      'man',
      'bat',
      'man',
    ])
    dst = {}
    expect(JSONPathCopy(data, dst, 'relatedPosts[*].tags[1]')).toEqual(['marvel', 'man', 'man'])
  })

  it('Should return only the data that exist if only some of the data have values.', () => {
    const dst = {}
    expect(JSONPathCopy(data, dst, 'releases[*].amd64')).toEqual([true, true])
  })

  it('Should return undefined if there is no matching path.', () => {
    const dst = {}
    expect(JSONPathCopy(data, dst, 'post.category')).toEqual(undefined)
  })

  it('Should return array of undefined if there is no matching path within array', () => {
    const dst = {}
    expect(JSONPathCopy(data, dst, 'releases[*].i386')).toEqual([undefined, undefined, undefined])
    expect(dst).toEqual({
      releases: [{}, {}, {}],
    })
  })
  it('Should return value from nested array', () => {
    let dst = {}
    expect(JSONPathCopy(data, dst, 'nestedArray.0.0.0')).toBe(1)
    expect(dst).toEqual({
      nestedArray: [[[1]]],
    })
    dst = {}
    expect(JSONPathCopy(data, dst, 'nestedArray[0][0][0]')).toBe(1)
    expect(dst).toEqual({
      nestedArray: [[[1]]],
    })
  })

  it('Should merge structured data', () => {
    const dst = {}
    JSONPathCopy(data, dst, 'relatedPosts.0')
    JSONPathCopy(data, dst, 'relatedPosts.1')
    expect(dst).toEqual({
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
      ],
    })
  })
})
