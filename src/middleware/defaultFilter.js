const defaultFilter = (c, next) => {
  c.req.query = (key) => {
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  next()

  if (typeof c.res === 'string') {
    c.res = new Reponse(c.res, {
      status: 200,
      headers: {
        'Conten-Type': 'text/plain',
      },
    })
  }
}

module.exports = defaultFilter
