import { getPathFromURL } from '../utils/url'

export const mergePath = (base: string, path: string) => {
  base = base.replace(/\/+$/, '')
  base = base + '/'
  path = path.replace(/^\/+/, '')
  return base + path
}

export const replaceUrlParam = (urlString: string, params: Record<string, string>) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp('/:' + k)
    urlString = urlString.replace(reg, `/${v}`)
  }
  return urlString
}

export const removeIndexString = (urlSting: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const path = getPathFromURL(urlSting)
  if (path === '/index') {
    return urlSting.replace(/index$/, '')
  }
  return urlSting
}
