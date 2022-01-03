const defaultFilter = require('./middleware/defaultFilter')
const poweredBy = require('./middleware/poweredBy/poweredBy')
const logger = require('./middleware/logger/logger')

function Middleware() {}

Middleware.defaultFilter = defaultFilter
Middleware.poweredBy = poweredBy
Middleware.logger = logger

module.exports = Middleware
