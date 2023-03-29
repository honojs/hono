import { parse } from 'fast-querystring'

const getQueryStringFromURL = (url: string): string => {
  const queryIndex = url.indexOf('?', 8)
  const result = queryIndex !== -1 ? url.slice(queryIndex + 1) : ''
  return result
}

export default (url, key?) => {
  const data = parse(getQueryStringFromURL(url))
  return key !== undefined ? data[key] : data 
}
