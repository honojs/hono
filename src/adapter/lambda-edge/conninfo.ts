import type { Context } from '../../context'
import type { GetConnInfo } from '../../helper/conninfo'
import type { CloudFrontEdgeEvent } from './handler'

type Env = {
  Bindings: {
    event: CloudFrontEdgeEvent
  }
}

export const getConnInfo: GetConnInfo = (c: Context<Env>) => ({
  remote: {
    address: c.env.event.Records[0].cf.request.clientIp,
  },
})
