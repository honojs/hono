import { Context } from '../../context'
import type { CloudFrontEdgeEvent } from './handler'
import { getConnInfo } from './conninfo'

describe('getConnInfo', () => {
  it('Should info is valid', () => {
    const clientIp = Math.random().toString()
    const env = {
      event: {
        Records: [
          {
            cf: {
              request: {
                clientIp,
              },
            },
          },
        ],
      } as CloudFrontEdgeEvent,
    }

    const c = new Context(new Request('http://localhost/'), { env })
    const info = getConnInfo(c)

    expect(info.remote.address).toBe(clientIp)
  })
})
