const filter = (c, next) => {
  c.req.query = (key) => {
    const url = new URL(c.req.url)
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
