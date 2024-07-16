import { Context } from '../../context'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  it('Should getConnInfo works', () => {
    const address = Math.random().toString()
    const req = new Request('http://localhost/', {
      headers: {
        'x-real-ip': address,
      },
    })
    const c = new Context(req)

    const info = getConnInfo(c)

    expect(info.remote.address).toBe(address)
  })
})
