import { getQueryParam } from '../../../src/utils/url'

export default (url, key?) => {
  return getQueryParam(url, key)
}
