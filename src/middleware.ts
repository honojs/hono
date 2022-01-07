import { defaultFilter } from './middleware/defaultFilter'
import { poweredBy } from './middleware/poweredBy/poweredBy'
import { logger } from './middleware/logger/logger'
import { basicAuth } from './middleware/basic-auth/basic-auth'

export class Middleware {
  static defaultFilter = defaultFilter
  static poweredBy = poweredBy
  static logger = logger
  static basicAuth = basicAuth
}
