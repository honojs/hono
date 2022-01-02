const poweredBy = (c, next) => {
  next()
  c.res.headers.append('X-Powered-By', 'Hono')
}

module.exports = poweredBy
