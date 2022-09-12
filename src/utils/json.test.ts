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
  }

  it('Should return the string or number pointed by JSON Path', () => {
    const dst = {}

    expect(JSONPathCopy(data, dst, 'post.title')).toBe('Hello')
    expect(dst).toEqual({ post: { title: 'Hello' } })
    expect(JSONPathCopy(data, dst, 'post.author.name')).toBe('Superman')
    expect(dst).toEqual({ post: { title: 'Hello', author: { name: 'Superman' } } })
    expect(JSONPathCopy(data, dst, 'post.author.age')).toBe(20)
    expect(dst).toEqual({ post: { title: 'Hello', author: { name: 'Superman', age: 20 } } })
    expect(JSONPathCopy(data, dst, 'post.tags.0')).toBe('foo')
    expect(dst).toEqual({
      post: {
        title: 'Hello',
        author: { name: 'Superman', age: 20 },
        tags: ['foo'],
      },
    })
    expect(JSONPathCopy(data, dst, 'post.tags.1')).toBe('bar')
    expect(dst).toEqual({
      post: {
        title: 'Hello',
        author: { name: 'Superman', age: 20 },
        tags: ['foo', 'bar'],
      },
    })
    expect(JSONPathCopy(data, dst, 'post.tags.2.framework')).toBe('Hono')
    expect(dst).toEqual({
      post: {
        title: 'Hello',
        author: { name: 'Superman', age: 20 },
        tags: ['foo', 'bar', { framework: 'Hono' }],
      },
    })
  })

  it('Should return undefined', () => {
    const dst = {}

    expect(JSONPathCopy(data, dst, 'post.foo')).toBe(undefined)
    expect(JSONPathCopy(data, dst, 'post.author.foo')).toBe(undefined)
    expect(JSONPathCopy(data, dst, 'post.tags.3')).toBe(undefined)
    expect(dst).toEqual({ post: { author: {}, tags: [] } })
  })

  it('Should return objects pointed by JSON Path', () => {
    const [dstPost, dstPostAuthor, dstPostTags] = [{}, {}, {}]

    expect(typeof JSONPathCopy(data, dstPost, 'post')).toBe('object')
    expect(dstPost).toEqual({
      post: {
        title: 'Hello',
        author: { name: 'Superman', age: 20 },
        tags: ['foo', 'bar', { framework: 'Hono' }],
      },
    })
    expect(JSONPathCopy(data, dstPostAuthor, 'post.author')).toEqual({ name: 'Superman', age: 20 })
    expect(dstPostAuthor).toEqual({ post: { author: { name: 'Superman', age: 20 } } })
    expect(JSONPathCopy(data, dstPostTags, 'post.tags').length).toBe(3)
    expect(dstPostTags).toEqual({
      post: { tags: ['foo', 'bar', { framework: 'Hono' }] },
    })
  })
})
