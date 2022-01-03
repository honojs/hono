const poweredBy = async (c, next) => {
  await next()
  await c.res.headers.append('X-Powered-By', 'Hono')
}

module.exports = poweredBy
