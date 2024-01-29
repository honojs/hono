import type { Context } from '../../context'

export type AcceptHeader =
  | 'Accept'
  | 'Accept-Charset'
  | 'Accept-Encoding'
  | 'Accept-Language'
  | 'Accept-Patch'
  | 'Accept-Post'
  | 'Accept-Ranges'

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

export const parseAccept = (acceptHeader: string) => {
  // Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
  const accepts = acceptHeader.split(',') // ['text/html', 'application/xhtml+xml', 'application/xml;q=0.9', 'image/webp', '*/*;q=0.8']
  return accepts.map((accept) => {
    const [type, ...params] = accept.trim().split(';') // ['application/xml', 'q=0.9']
    const q = params.find((param) => param.startsWith('q=')) // 'q=0.9'
    return {
      type,
      params: params.reduce((acc, param) => {
        const [key, value] = param.split('=')
        return { ...acc, [key.trim()]: value.trim() }
      }, {}),
      q: q ? parseFloat(q.split('=')[1]) : 1,
    }
  })
}

export const defaultMatch = (accepts: Accept[], config: acceptsConfig) => {
  const { supports, default: defaultSupport } = config
  const accept = accepts.sort((a, b) => b.q - a.q).find((accept) => supports.includes(accept.type))
  return accept ? accept.type : defaultSupport
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
export const accepts = (c: Context, options: acceptsOptions) => {
  const acceptHeader = c.req.header(options.header)
  if (!acceptHeader) {
    return options.default
  }
  const accepts = parseAccept(acceptHeader)
  const match = options.match || defaultMatch

  return match(accepts, options)
}
