import { describe, expect, it } from 'bun:test'
import { Context } from 'hono'
import { getBunServer } from './server'

describe('getBunServer', () => {
  it('Should success to pick Server', () => {
    const server = {}

    expect(
      getBunServer<typeof server>(new Context(new Request('http://localhost/'), { env: server }))
    ).toBe(server)
    expect(
      getBunServer<typeof server>(
        new Context(new Request('http://localhost/'), { env: { server } })
      )
    ).toBe(server)
  })
})
