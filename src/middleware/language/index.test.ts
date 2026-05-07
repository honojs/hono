import { Hono } from '../../hono'
import { detectors } from './language'
import { languageDetector } from '.'

describe('languageDetector', () => {
  const createTestApp = (options = {}) => {
    const app = new Hono()

    app.use('/*', languageDetector(options))

    app.get('/*', (c) => c.text(c.get('language')))

    return app
  }

  describe('Query Parameter Detection', () => {
    it('should detect language from query parameter', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr', 'es'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/?lang=fr')
      expect(await res.text()).toBe('fr')
    })

    it('should ignore unsupported languages in query', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/?lang=de')
      expect(await res.text()).toBe('en')
    })
  })

  describe('Cookie Detection', () => {
    it('should detect language from cookie', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/', {
        headers: {
          cookie: 'language=fr',
        },
      })
      expect(await res.text()).toBe('fr')
    })

    it('should cache detected language in cookie when enabled', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        caches: ['cookie'],
      })

      const res = await app.request('/?lang=fr')
      expect(res.headers.get('set-cookie')).toContain('language=fr')
    })
  })

  describe('Header Detection', () => {
    it('should detect language from Accept-Language header', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr', 'es'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      })
      expect(await res.text()).toBe('fr')
    })

    it('should fallback to language code when locale code is not in supportedLanguages', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'ja'],
        fallbackLanguage: 'en',
        order: ['header'],
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'ja-JP',
        },
      })
      expect(await res.text()).toBe('ja')
    })

    it('should match after multiple truncations', async () => {
      const app = createTestApp({
        supportedLanguages: ['zh-Hant', 'en'],
        fallbackLanguage: 'en',
        order: ['header'],
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'zh-Hant-CN',
        },
      })
      expect(await res.text()).toBe('zh-Hant')
    })

    it('should fallback when truncation does not match any supported language', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'ja'],
        fallbackLanguage: 'en',
        order: ['header'],
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'ko-KR',
        },
      })
      expect(await res.text()).toBe('en')
    })

    it('should prefer exact match over truncated match', async () => {
      const app = createTestApp({
        supportedLanguages: ['fr', 'fr-CA'],
        fallbackLanguage: 'fr',
        order: ['header'],
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'fr-CA',
        },
      })
      expect(await res.text()).toBe('fr-CA')
    })

    it('should handle case-insensitive truncation matching', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'ja'],
        fallbackLanguage: 'en',
        order: ['header'],
        ignoreCase: true,
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'JA-JP',
        },
      })
      expect(await res.text()).toBe('ja')
    })

    it('should handle malformed Accept-Language headers', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/', {
        headers: {
          'accept-language': 'invalid;header;;format',
        },
      })
      expect(await res.text()).toBe('en')
    })
  })

  describe('Path Detection', () => {
    it('should detect language from path', async () => {
      const app = createTestApp({
        order: ['path'],
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        lookupFromPathIndex: 0,
      })

      const res = await app.request('/fr/page')
      expect(await res.text()).toBe('fr')
    })

    it('should handle invalid path index gracefully', async () => {
      const app = createTestApp({
        order: ['path'],
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        lookupFromPathIndex: 99,
      })

      const res = await app.request('/fr/page')
      expect(await res.text()).toBe('en')
    })

    it('should detect language from original URL when getPath modifies the path', async () => {
      const app = new Hono({
        getPath: (req) => {
          const url = new URL(req.url)
          let pathname = url.pathname
          // Remove language prefix /fr/
          if (pathname.startsWith('/fr/')) {
            pathname = pathname.replace('/fr/', '/')
          }
          return pathname
        },
      })

      app.use(
        '*',
        languageDetector({
          order: ['path'],
          supportedLanguages: ['en', 'fr'],
          fallbackLanguage: 'en',
          lookupFromPathIndex: 0,
        })
      )

      app.get('/home', (c) => c.text(c.get('language')))

      const res = await app.request('/fr/home')
      expect(await res.text()).toBe('fr')
    })
  })

  describe('Detection Order', () => {
    it('should respect detection order', async () => {
      const app = createTestApp({
        order: ['cookie', 'querystring'],
        supportedLanguages: ['en', 'fr', 'es'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/?lang=fr', {
        headers: {
          cookie: 'language=es',
        },
      })

      // Since cookie is first in order, it should use 'es'
      expect(await res.text()).toBe('es')
    })

    it('should fall back to next detector if first fails', async () => {
      const app = createTestApp({
        order: ['cookie', 'querystring'],
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
      })

      const res = await app.request('/?lang=fr') // No cookie
      expect(await res.text()).toBe('fr') // Should use querystring
    })
  })

  describe('Language Conversion', () => {
    it('should apply language conversion function', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        convertDetectedLanguage: (lang: string) => lang.split('-')[0],
      })

      const res = await app.request('/?lang=fr-FR')
      expect(await res.text()).toBe('fr')
    })

    it('should handle case sensitivity according to options', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        ignoreCase: false,
      })

      const res = await app.request('/?lang=FR')
      expect(await res.text()).toBe('en') // Falls back because case doesn't match
    })
  })

  describe('Error Handling', () => {
    it('should fall back to default language on error', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
      })

      const detector = vi.spyOn(detectors, 'querystring').mockImplementation(() => {
        throw new Error('Simulated error')
      })

      const res = await app.request('/?lang=fr')
      expect(await res.text()).toBe('en')

      detector.mockRestore()
    })

    it('should handle missing cookie values gracefully', async () => {
      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        order: ['cookie'],
      })

      const res = await app.request('/')
      expect(await res.text()).toBe('en')
    })
  })

  describe('Configuration Validation', () => {
    it('should throw if fallback language is not in supported languages', () => {
      expect(() => {
        createTestApp({
          supportedLanguages: ['fr', 'es'],
          fallbackLanguage: 'en',
        })
      }).toThrow()
    })

    it('should throw if path index is negative', () => {
      expect(() => {
        createTestApp({
          lookupFromPathIndex: -1,
        })
      }).toThrow()
    })

    it('should handle empty supported languages list', () => {
      expect(() => {
        createTestApp({
          supportedLanguages: [],
        })
      }).toThrow()
    })
  })

  describe('Debug Mode', () => {
    it('should log errors in debug mode', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')

      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        debug: true,
      })

      const detector = vi.spyOn(detectors, 'querystring').mockImplementation(() => {
        throw new Error('Simulated error')
      })

      await app.request('/?lang=fr')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in querystring detector:',
        expect.any(Error)
      )

      detector.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    // The log test remains unchanged
    it('should log debug information when enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const app = createTestApp({
        supportedLanguages: ['en', 'fr'],
        fallbackLanguage: 'en',
        debug: true,
      })

      await app.request('/?lang=fr')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Language detected from querystring')
      )

      consoleSpy.mockRestore()
    })
  })
})
