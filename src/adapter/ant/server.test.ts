import { Context } from '../../context'
import { getAntServer } from './server'

describe('getAntServer', () => {
  it('Should success to pick Server', () => {
    const server = {}

    expect(getAntServer(new Context(new Request('http://localhost/'), { env: server }))).toBe(
      server
    )
    expect(getAntServer(new Context(new Request('http://localhost/'), { env: { server } }))).toBe(
      server
    )
  })
})
