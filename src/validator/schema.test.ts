import type { Expect, Equal } from '../utils/types'
import type { SchemaToProp } from './schema'
import type { Validator } from './validator'

describe('SchemaToProp', () => {
  const schema = (v: Validator) => ({
    post: {
      id: v.json('id').asNumber(),
      title: v.json('title'),
      tags: v.array('tags', (v) => ({
        name: v.json('name'),
      })),
      meta: v.object('meta', (v) => ({
        currentPage: v.json('currentPage').asNumber(),
      })),
    },
  })

  it('Should return correct types', () => {
    const data = {
      post: {
        id: 1,
        title: 'Hello',
        tags: [
          {
            name: 'Daily',
          },
        ],
        meta: {
          currentPage: 1,
        },
      },
    }

    type T = SchemaToProp<ReturnType<typeof schema>>
    type Data = typeof data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type verify = Expect<Equal<T, Data>>
    expect(true).toBe(true) // Fake
  })
})
