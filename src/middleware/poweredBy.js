const poweredBy = async (c, next) => {
  next()
  await c.res.headers.append('X-Powered-By', 'Hono')
}

module.exports = poweredBy
