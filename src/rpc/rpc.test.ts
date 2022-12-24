/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod'
import { Hono } from '../hono'
import type { Equal } from '../utils/types'
import type { Expect } from '../utils/types'
import { mockValidator } from './mock-validator'

describe('`c.jsonT()` and `app.build`', () => {
  const app = new Hono()
  const route = app
    .get('/posts', (c) => {
      return c.jsonT({
        id: 123,
        title: 'Hello',
        flag: true,
      })
    })
    .build()

  it('Should return correct types with c.jsonT() and app.build()', () => {
    type ExpectType = {
      output: {
        json: {
          id: number
          title: string
          flag: boolean
        }
      }
    }
    type verify = Expect<Equal<ExpectType, typeof route>>
  })
})

describe('Mock validator with Zod', () => {
  const app = new Hono()

  const schema = z.object({
    name: z.string(),
    age: z.number(),
    nickname: z.string().optional(),
  })

  const route = app
    .post('/author', mockValidator('json', schema), (c) => {
      const author = c.req.valid()
      return c.jsonT(author)
    })
    .build()

  it('Should validate JSON object and return t200 response', async () => {
    const obj = {
      name: 'young man',
      age: 20,
      nickname: 'YMCA',
    }

    const res = await app.request('http://localhost/author', {
      method: 'POST',
      body: JSON.stringify(obj),
    })

    expect(res.status).toBe(200)
  })

  it('Should return types correctly', () => {
    type AppType = typeof route
    type ExpectType = {
      post: {
        '/author': {
          input: {
            json: {
              nickname?: string | undefined
              name: string
              age: number
            }
          }
          output: {
            json: { nickname?: string | undefined; name: string; age: number }
          }
        }
      }
    }
    type verify = Expect<Equal<ExpectType, AppType>>
  })
})
