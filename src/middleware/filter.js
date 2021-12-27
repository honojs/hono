const filter = (c, next) => {
  c.req.query = (key) => {
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }
  next()
}

module.exports = filter
