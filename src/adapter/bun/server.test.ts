import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { getBunServer } from './server'
import type { BunServer } from './server'

describe('getBunServer', () => {
  it('Should success to pick Server', () => {
    const server = {} as BunServer

    expect(
      getBunServer(new Context(new HonoRequest(new Request('http://localhost/')), { env: server }))
    ).toBe(server)
    expect(
      getBunServer(
        new Context(new HonoRequest(new Request('http://localhost/')), { env: { server } })
      )
    ).toBe(server)
  })
})
