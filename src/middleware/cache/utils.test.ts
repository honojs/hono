import {
  parseDirectiveList,
  shouldNotStore,
  parseMaxAge,
  parseHeaderList,
  buildVaryKeySuffix,
} from './utils'

describe('parseDirectiveList', () => {
  it('parses bare directives', () => {
    const m = parseDirectiveList('no-store, public')
    expect(m.get('no-store')).toBeUndefined()
    expect(m.get('public')).toBeUndefined()
    expect(m.has('private')).toBe(false)
  })

  it('parses key=value directives', () => {
    const m = parseDirectiveList('max-age=3600, s-maxage=60')
    expect(m.get('max-age')).toBe('3600')
    expect(m.get('s-maxage')).toBe('60')
  })

  it('parses quoted values containing commas', () => {
    const m = parseDirectiveList('no-cache="Set-Cookie, X-Foo", max-age=10')
    expect(m.get('no-cache')).toBe('Set-Cookie, X-Foo')
    expect(m.get('max-age')).toBe('10')
  })

  it('lowercases directive names but preserves value casing', () => {
    const m = parseDirectiveList('Max-Age=3600, Private="X-Auth"')
    expect(m.get('max-age')).toBe('3600')
    expect(m.get('private')).toBe('X-Auth')
  })

  it('handles empty / null / whitespace', () => {
    expect(parseDirectiveList('').size).toBe(0)
    expect(parseDirectiveList(null).size).toBe(0)
    expect(parseDirectiveList(undefined).size).toBe(0)
    expect(parseDirectiveList('  ,  ').size).toBe(0)
  })
})

describe('shouldNotStore', () => {
  it('blocks bare no-store / no-cache / private', () => {
    expect(shouldNotStore('no-store')).toBe(true)
    expect(shouldNotStore('no-cache')).toBe(true)
    expect(shouldNotStore('private, max-age=10')).toBe(true)
  })

  it('does NOT block field-list forms (RFC 7234 fix)', () => {
    expect(shouldNotStore('no-cache="Set-Cookie"')).toBe(false)
    expect(shouldNotStore('private="X-Auth-Token", max-age=60')).toBe(false)
  })

  it('returns false for empty / public / max-age', () => {
    expect(shouldNotStore('public, max-age=10')).toBe(false)
    expect(shouldNotStore('')).toBe(false)
    expect(shouldNotStore(null)).toBe(false)
  })
})

describe('parseMaxAge', () => {
  it('returns max-age when present', () => {
    expect(parseMaxAge('max-age=600')).toBe(600)
  })

  it('s-maxage overrides max-age', () => {
    expect(parseMaxAge('s-maxage=30, max-age=600')).toBe(30)
  })

  it('returns undefined for missing or invalid', () => {
    expect(parseMaxAge('public')).toBeUndefined()
    expect(parseMaxAge('max-age=abc')).toBeUndefined()
    expect(parseMaxAge('max-age=-5')).toBeUndefined()
    expect(parseMaxAge(null)).toBeUndefined()
  })

  it('accepts 0 as valid TTL', () => {
    expect(parseMaxAge('max-age=0')).toBe(0)
  })
})

describe('parseHeaderList', () => {
  it('handles array input, lowercases, dedupes, sorts', () => {
    expect(parseHeaderList(['Accept-Encoding', 'accept', 'Accept'])).toEqual([
      'accept',
      'accept-encoding',
    ])
  })

  it('handles comma-separated string', () => {
    expect(parseHeaderList('Accept, Accept-Language')).toEqual(['accept', 'accept-language'])
  })

  it('returns [] for empty / null', () => {
    expect(parseHeaderList(undefined)).toEqual([])
    expect(parseHeaderList(null)).toEqual([])
    expect(parseHeaderList('')).toEqual([])
    expect(parseHeaderList([])).toEqual([])
  })
})

describe('buildVaryKeySuffix', () => {
  it('returns "" for no vary headers', () => {
    expect(buildVaryKeySuffix([], new Headers())).toBe('')
  })

  it('encodes header name=value separated by NUL', () => {
    const h = new Headers({ 'Accept-Encoding': 'gzip' })
    expect(buildVaryKeySuffix(['Accept-Encoding'], h)).toBe('\x00accept-encoding=gzip')
  })

  it('treats missing request header as empty value', () => {
    const h = new Headers({ Accept: 'text/html' })
    expect(buildVaryKeySuffix(['Accept', 'Accept-Encoding'], h)).toBe(
      '\x00accept=text/html\x00accept-encoding='
    )
  })

  it('is order-independent across vary headers (sorted)', () => {
    const h = new Headers({ Accept: 'a', 'Accept-Language': 'b' })
    const a = buildVaryKeySuffix(['Accept', 'Accept-Language'], h)
    const b = buildVaryKeySuffix(['Accept-Language', 'Accept'], h)
    expect(a).toBe(b)
  })

  it('case-insensitive header names', () => {
    const h = new Headers({ accept: 'a' })
    const a = buildVaryKeySuffix(['Accept'], h)
    const b = buildVaryKeySuffix(['ACCEPT'], h)
    expect(a).toBe(b)
  })
})
