const filter = (req, res, next) => {
  const url = new URL(req.url)
  req.query = (key) => {
    return url.searchParams.get(key)
  }
  next()
  if (typeof res === 'string') {
    res = new Response(res, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}

module.exports = filter
