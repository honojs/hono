import type { Context } from '../../context'
import type { GetConnInfo } from '../../helper/conninfo'
import type { CloudFrontEdgeEvent } from './handler'

type Env = {
  Bindings: {
    event: CloudFrontEdgeEvent
  }
}

/**
 * @deprecated `hono/lambda-edge` will be removed in v5. Install `@hono/lambda-edge` and import from there instead.
 */
export const getConnInfo: GetConnInfo = (c: Context<Env>) => ({
  remote: {
    address: c.env.event.Records[0].cf.request.clientIp,
  },
})
