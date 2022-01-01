const poweredBy = require('./middleware/poweredBy')

function Middleware() {}

Middleware.poweredBy = poweredBy

module.exports = Middleware
