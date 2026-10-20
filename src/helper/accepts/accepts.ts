import type { Context } from '../../context'
import { parseAccept } from '../../utils/accept'
import type { AcceptHeader } from '../../utils/headers'

export interface Accept {
  type: string
  params: Record<string, string>
  q: number
}

export interface acceptsConfig {
  header: AcceptHeader
  supports: string[]
  default: string
}

export interface acceptsOptions extends acceptsConfig {
  match?: (accepts: Accept[], config: acceptsConfig) => string
}

const matchType = (acceptType: string, supportedType: string): boolean => {
  // Media types and language tags are both case-insensitive (RFC 9110 §8.3.1,
  // RFC 4647 §2.1), so compare them case-folded. `defaultMatch` returns the
  // caller's own `supports` entry, so its casing is preserved.
  const accept = acceptType.toLowerCase()
  const supported = supportedType.toLowerCase()

  if (accept === supported) {
    return true
  }
  if (accept === '*/*' || accept === '*') {
    return false
  }
  if (accept.endsWith('/*')) {
    const [acceptMain] = accept.split('/')
    const [supportedMain] = supported.split('/')
    return acceptMain === supportedMain
  }
  return false
}

const getSpecificity = (type: string): number => {
  if (type === '*/*' || type === '*') {
    return 1
  }
  if (type.endsWith('/*')) {
    return 2
  }
  return 3
}

export const defaultMatch = (accepts: Accept[], config: acceptsConfig): string => {
  const { supports, default: defaultSupport } = config
  // An exact media type determines its quality even when a subtype wildcard
  // has a higher q (RFC 9110 §12.5.1). Keep q=0 entries here so a wildcard
  // cannot re-enable a type the client explicitly rejected.
  const exactTypes = new Set(
    accepts
      .filter((accept) => getSpecificity(accept.type) === 3)
      .map((accept) => accept.type.toLowerCase())
  )
  // A quality value of 0 means "not acceptable" (RFC 9110 §12.5.1), so such
  // entries must never match, the same rule the compress middleware applies.
  const sortedAccepts = accepts
    .filter((accept) => accept.q > 0)
    .sort((a, b) => {
      if (b.q !== a.q) {
        return b.q - a.q
      }
      return getSpecificity(b.type) - getSpecificity(a.type)
    })

  for (const accept of sortedAccepts) {
    const matched = supports.find(
      (supported) =>
        matchType(accept.type, supported) &&
        (getSpecificity(accept.type) !== 2 || !exactTypes.has(supported.toLowerCase()))
    )
    if (matched) {
      return matched
    }
  }
  return defaultSupport
}

/**
 * Match the accept header with the given options.
 * @example
 * ```ts
 * app.get('/users', (c) => {
 *   const lang = accepts(c, {
 *     header: 'Accept-Language',
 *     supports: ['en', 'zh'],
 *     default: 'en',
 *   })
 * })
 * ```
 */
export const accepts = (c: Context, options: acceptsOptions): string => {
  const acceptHeader = c.req.header(options.header)
  if (!acceptHeader) {
    return options.default
  }
  const accepts = parseAccept(acceptHeader)
  const match = options.match || defaultMatch

  return match(accepts, options)
}
