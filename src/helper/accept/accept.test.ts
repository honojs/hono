import type { Accept, MatchAcceptConfig, MatchAcceptOptions } from './accept'
import { parseAccept, defaultMatch, matchAccept } from './accept'

describe('parseAccept', () => {
  test('should parse accept header', () => {
    const acceptHeader =
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8;level=1;foo=bar'
    const accepts = parseAccept(acceptHeader)
    expect(accepts).toEqual([
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8', level: '1', foo: 'bar' }, q: 0.8 },
    ])
  })
})

describe('defaultMatch', () => {
  test('should return default support', () => {
    const accepts: Accept[] = [
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8' }, q: 0.8 },
    ]
    const config: MatchAcceptConfig = {
      header: 'Accept',
      supports: ['text/html'],
      default: 'text/html',
    }
    const result = defaultMatch(accepts, config)
    expect(result).toBe('text/html')
  })
})

describe('matchAccept', () => {
  test('should return matched support', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    } as any
    const options: MatchAcceptConfig = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
    }
    const result = matchAccept(c, options)
    expect(result).toBe('text/html')
  })

  test('should return default support if no matched support', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    } as any
    const options: MatchAcceptConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    }
    const result = matchAccept(c, options)
    expect(result).toBe('text/html')
  })

  test('should return default support if no accept header', () => {
    const c = {
      req: {
        header: () => undefined,
      },
    } as any
    const options: MatchAcceptConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    }
    const result = matchAccept(c, options)
    expect(result).toBe('text/html')
  })

  test('should return matched support with custom match function', () => {
    const c = {
      req: {
        header: () => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    } as any
    // this match function will return the least q value
    const match = (accepts: Accept[], config: MatchAcceptConfig) => {
      const { supports, default: defaultSupport } = config
      const accept = accepts
        .sort((a, b) => a.q - b.q)
        .find((accept) => supports.includes(accept.type))
      return accept ? accept.type : defaultSupport
    }
    const options: MatchAcceptOptions = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
      match,
    }
    const result = matchAccept(c, options)
    expect(result).toBe('application/xml')
  })
})
