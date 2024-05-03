import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  it('Should getConnInfo works', () => {
    const address = Math.random().toString()
    const req = new Request('http://localhost/', {
      headers: {
        'cf-connecting-ip': address,
      },
    })
    const c = new Context(new HonoRequest(req))

    const info = getConnInfo(c)

    expect(info.remote.address).toBe(address)
  })
})
