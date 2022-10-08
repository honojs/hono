import { mergeObjects } from './object'

describe('mergeObject', () => {
  it('Should merge two objects into one object', () => {
    const src = { author: { name: 'superman' }, posts: [{ id: 123 }, { id: 456 }] }
    const dst = { author: { age: 20 }, posts: [{ title: 'JavaScript' }, { title: 'Framework' }] }
    const res = mergeObjects(dst, src)
    expect(res).toEqual({
      posts: [
        {
          id: 123,
          title: 'JavaScript',
        },
        {
          id: 456,
          title: 'Framework',
        },
      ],
      author: {
        name: 'superman',
        age: 20,
      },
    })
  })
})
