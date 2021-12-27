const splitPath = (path) => {
  path = path.split(/\//) // faster than path.split('/')
  if (path[0] === '') {
    path.shift()
  }
  return path
}

const getPattern = (label) => {
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)
  //const name = ''
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
  if (match) {
    if (match[2]) {
      return [match[1], '(' + match[2] + ')']
    } else {
      return [match[1], '(.+)']
    }
  }
}

module.exports = {
  splitPath,
  getPattern,
}
