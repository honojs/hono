const splitPath = (path) => {
  path = path.replace(/^\//, '')
  return path.split('/')
}

const getPattern = (label) => {
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)
  const match = label.match(/^\:.+?\{(.+)\}$/)
  if (match) {
    return '(' + match[1] + ')'
  }
  return '(.+)'
}

const getParamName = (label) => {
  const match = label.match(/^\:([^\{\}]+)/)
  if (match) {
    return match[1]
  }
}

module.exports = {
  splitPath,
  getPattern,
  getParamName,
}
