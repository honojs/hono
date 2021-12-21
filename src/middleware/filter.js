const filter = (c, next) => {
  const url = new URL(c.req.url)
  c.req.query = (key) => {
    return url.searchParams.get(key)
  }

  next()

  if (typeof c.res === 'string') {
    c.res = new Response(c.res, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}

module.exports = filter
