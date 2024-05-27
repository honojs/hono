import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { type BunServer, getBunServer } from './server'

describe('getBunServer', () => {
  it('Should success to pick Server', () => {
    const server = {} as BunServer

    expect(getBunServer(new Context(new HonoRequest(new Request('http://localhost/')), { env: server }))).toBe(
      server
    )
    expect(getBunServer(new Context(new HonoRequest(new Request('http://localhost/')), { env: { server } }))).toBe(
      server
    )
  })
})
