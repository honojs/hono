import type { Context } from '../../context'
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

export const parseAccept = (acceptHeader: string): Accept[] => {
  // Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
  const accepts = acceptHeader.split(',') // ['text/html', 'application/xhtml+xml', 'application/xml;q=0.9', 'image/webp', '*/*;q=0.8']
  return accepts.map((accept) => {
    const parts = accept.trim().split(';') // ['text/html', 'q=0.9', 'image/webp']
    const type = parts[0] // text/html
    const params = parts.slice(1) // ['q=0.9', 'image/webp']
    const q = params.find((param) => param.startsWith('q='))

    const paramsObject = params.reduce((acc, param) => {
      const keyValue = param.split('=')
      const key = keyValue[0].trim()
      const value = keyValue[1].trim()
      acc[key] = value
      return acc
    }, {} as { [key: string]: string })

    return {
      type: type,
      params: paramsObject,
      q: q ? parseFloat(q.split('=')[1]) : 1,
    }
  })
}

export const defaultMatch = (accepts: Accept[], config: acceptsConfig): string => {
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
export const accepts = (c: Context, options: acceptsOptions): string => {
  const acceptHeader = c.req.header(options.header)
  if (!acceptHeader) {
    return options.default
  }
  const accepts = parseAccept(acceptHeader)
  const match = options.match || defaultMatch

  return match(accepts, options)
}
