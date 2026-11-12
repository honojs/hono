const varyAcceptEncodingRegExp = /(?:^|,)\s*accept-encoding\s*(?:,|$)/i

export const addAcceptEncodingToVary = (vary: string | null): string => {
  if (!vary) {
    return 'Accept-Encoding'
  }
  if (vary === '*' || varyAcceptEncodingRegExp.test(vary)) {
    return vary
  }
  return `${vary}, Accept-Encoding`
}
