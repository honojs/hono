/**
 * Converts string to puny code
 * @param string - string to be converted
 * @param options - options
 * @returns converted string (puny code)
 * @example
 * ```typescript
 * const url = toPunyCode('https://🔥.com'); // https://xn--4v8h.com
 * // usage
 * c.redirect(url);
 * ```
 */

const prefix = 'http://'

export const toPunyCode = (
  string: string,
  options: {
    strict?: boolean
  } = {
    strict: true,
  }
): string => {
  const { strict } = options

  let punyCode = ''
  try {
    punyCode = new URL(string).href
  } catch {
    if (strict) {
      punyCode = string
    } else {
      const isEndSlash = string.endsWith('/')
      punyCode = new URL(prefix + string).href.replace(prefix, '')
      if (!isEndSlash) {
        punyCode = punyCode.slice(0, -1)
      }
    }
  }

  return punyCode
}
