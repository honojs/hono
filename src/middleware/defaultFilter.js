const defaultFilter = async (c, next) => {
  c.req.query = (key) => {
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  await next()

  if (typeof c.res === 'string') {
    c.res = new Response(c.res, {
      status: 200,
      headers: {
        'Conten-Type': 'text/plain',
      },
    })
  }
}

module.exports = defaultFilter
