const defaultFilter = require('./middleware/defaultFilter')
const poweredBy = require('./middleware/poweredBy')

function Middleware() {}

Middleware.defaultFilter = defaultFilter
Middleware.poweredBy = poweredBy

module.exports = Middleware
