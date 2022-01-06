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

export const getPathFromURL = (url: string) => {
  // XXX
  const match = url.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/)
  if (match) {
    return match[5]
  }
  return ''
}

const bufferEqual = (a: ArrayBuffer, b: ArrayBuffer) => {
  if (a === b) {
    return true
  }
  if (a.byteLength !== b.byteLength) {
    return false
  }

  const va = new DataView(a)
  const vb = new DataView(b)

  let i = va.byteLength
  while (i--) {
    if (va.getUint8(i) !== vb.getUint8(i)) {
      return false
    }
  }

  return true
}

export const timingSafeEqual = async (a: any, b: any) => {
  const sa = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    new TextEncoder().encode(String(a))
  )

  const sb = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    new TextEncoder().encode(String(b))
  )

  return bufferEqual(sa, sb) && a === b
}
