import { Hono } from '../..'
import { parseAcceptLanguage, simpleLangMatch, i18n } from './i18n'

describe('parseAcceptLanguage', () => {
  it('should parse accept-language blank', () => {
    expect(parseAcceptLanguage('')).toEqual([{ lang: '*', q: 1 }])
  })

  it('should parse accept-language *', () => {
    expect(parseAcceptLanguage('*')).toEqual([{ lang: '*', q: 1 }])
  })

  it('should parse accept-language single', () => {
    expect(parseAcceptLanguage('en')).toEqual([{ lang: 'en', q: 1 }])
  })

  it('should parse accept-language single with q', () => {
    expect(parseAcceptLanguage('en;q=0.8')).toEqual([{ lang: 'en', q: 0.8 }])
  })

  it('should parse accept-language multiple', () => {
    expect(parseAcceptLanguage('en,ja')).toEqual([
      { lang: 'en', q: 1 },
      { lang: 'ja', q: 1 },
    ])
  })

  it('should parse accept-language multiple with q', () => {
    expect(parseAcceptLanguage('en;q=0.8,ja;q=0.9')).toEqual([
      { lang: 'en', q: 0.8 },
      { lang: 'ja', q: 0.9 },
    ])
  })
})

describe('simpleLangMatch', () => {
  it('should match single', () => {
    expect(
      simpleLangMatch([{ lang: 'en', q: 1 }], {
        defaultLang: 'en',
        supportedLangs: ['en'],
      })
    ).toEqual('en')
  })

  it('should match multiple', () => {
    expect(
      simpleLangMatch([{ lang: 'en', q: 1 }], {
        defaultLang: 'en',
        supportedLangs: ['en', 'ja'],
      })
    ).toEqual('en')
  })

  it('should match multiple with q', () => {
    expect(
      simpleLangMatch(
        [
          { lang: 'en', q: 0.8 },
          { lang: 'ja', q: 0.9 },
        ],
        {
          defaultLang: 'en',
          supportedLangs: ['en', 'ja'],
        }
      )
    ).toEqual('ja')
  })

  it('should not match', () => {
    expect(
      simpleLangMatch([{ lang: 'en', q: 0.8 }], {
        defaultLang: 'ja',
        supportedLangs: ['ja'],
      })
    ).toEqual('ja')
  })
})

describe('i18n', () => {
  let app = new Hono()

  afterEach(() => {
    app = new Hono()
  })

  it('should set default lang', async () => {
    app.use(i18n({ defaultLang: 'en', supportedLangs: ['en', 'ja'] }))
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/')
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('en')
  })

  it('should set lang from header', async () => {
    app.use(i18n({ defaultLang: 'en', supportedLangs: ['en', 'ja'] }))
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/', { headers: { 'accept-language': 'ja' } })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('ja')
  })

  it('should set lang from header with multiple lang', async () => {
    app.use(i18n({ defaultLang: 'en', supportedLangs: ['en', 'ja'] }))
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/', { headers: { 'accept-language': 'ja,en' } })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('ja')
  })

  it('should set lang from header with multiple lang with q', async () => {
    app.use(i18n({ defaultLang: 'en', supportedLangs: ['en', 'ja'] }))
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/', { headers: { 'accept-language': 'ja;q=0.8,en;q=0.9' } })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('en')
  })
})

describe('i18n with custom target header', () => {
  let app = new Hono()

  afterEach(() => {
    app = new Hono()
  })

  it('should set lang from header', async () => {
    app.use(
      i18n({ defaultLang: 'en', supportedLangs: ['en', 'ja'], targetHeader: 'x-accept-language' })
    )
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/', { headers: { 'x-accept-language': 'ja' } })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('ja')
  })
})

describe('i18n with custom langMatch', () => {
  let app = new Hono()

  afterEach(() => {
    app = new Hono()
  })

  it('should set lang from header', async () => {
    app.use(
      i18n({
        defaultLang: 'en',
        supportedLangs: ['en', 'ja'],
        langMatch: (acceptLanguages, config) => {
          return acceptLanguages.reverse().at(0)?.lang || config.defaultLang
        },
      })
    )
    app.get('/', (c) => c.text(c.get('lang')))
    const res = await app.request('/', { headers: { 'accept-language': 'ja;q=0.8,en;q=0.9' } })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('en')
  })
})
