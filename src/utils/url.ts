const URL_REGEXP = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/

export const splitPath = (path: string): string[] => {
  const paths = path.split(/\//) // faster than path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  return paths
}

export const getPattern = (label: string): string[] | null => {
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
  return null
}

export const getPathFromURL = (url: string): string => {
  const match = url.match(URL_REGEXP)
  if (match) {
    return match[5]
  }
  return ''
}

export const isAbsoluteURL = (url: string): boolean => {
  const match = url.match(URL_REGEXP)
  if (match && match[1]) {
    return true
  }
  return false
}
