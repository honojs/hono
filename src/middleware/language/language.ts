/**
 * @module
 * Language module for Hono.
 */
import type { Context } from '../../context'
import { setCookie, getCookie } from '../../helper/cookie'
import type { MiddlewareHandler } from '../../types'

export type DetectorType = 'path' | 'querystring' | 'cookie' | 'header'
export type CacheType = 'cookie'

export interface DetectorOptions {
  /** Order of language detection strategies */
  order: DetectorType[]
  /** Query parameter name for language */
  lookupQuerystring: string
  /** Cookie name for language */
  lookupCookie: string
  /** Index in URL path where language code appears */
  lookupFromPathIndex: number
  /** Header key for language detection */
  lookupFromHeaderKey: string
  /** Caching strategies */
  caches: CacheType[] | false
  /** Cookie configuration options */
  cookieOptions?: {
    domain?: string
    path?: string
    sameSite?: 'Strict' | 'Lax' | 'None'
    secure?: boolean
    maxAge?: number
    httpOnly?: boolean
  }
  /** Whether to ignore case in language codes */
  ignoreCase: boolean
  /** Default language if none detected */
  fallbackLanguage: string
  /** List of supported language codes */
  supportedLanguages: string[]
  /** Optional function to transform detected language codes */
  convertDetectedLanguage?: (lang: string) => string
  /** Enable debug logging */
  debug?: boolean
}

export interface LanguageVariables {
  language: string
}

const DEFAULT_OPTIONS: DetectorOptions = {
  order: ['querystring', 'cookie', 'header'],
  lookupQuerystring: 'lang',
  lookupCookie: 'language',
  lookupFromHeaderKey: 'accept-language',
  lookupFromPathIndex: 0,
  caches: ['cookie'],
  ignoreCase: true,
  fallbackLanguage: 'en',
  supportedLanguages: ['en'],
  cookieOptions: {
    sameSite: 'Strict',
    secure: true,
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
  },
  debug: false,
}
/**
 * Parse Accept-Language header values with quality scores
 * @param header Accept-Language header string
 * @returns Array of parsed languages with quality scores
 */
export function parseAcceptLanguage(header: string): Array<{ lang: string; q: number }> {
  try {
    return header
      .split(',')
      .map((lang) => {
        const [language, quality = 'q=1.0'] = lang
          .trim()
          .split(';')
          .map((s) => s.trim())
        const q = parseFloat(quality.replace('q=', ''))
        return {
          lang: language,
          q: isNaN(q) ? 1.0 : Math.max(0, Math.min(1, q)),
        }
      })
      .sort((a, b) => b.q - a.q)
  } catch {
    return []
  }
}

/**
 * Validate and normalize language codes
 * @param lang Language code to normalize
 * @param options Detector options
 * @returns Normalized language code or undefined
 */
export function normalizeLanguage(
  lang: string | null | undefined,
  options: DetectorOptions
): string | undefined {
  if (!lang) {
    return undefined
  }

  try {
    let normalizedLang = lang.trim()
    if (options.convertDetectedLanguage) {
      normalizedLang = options.convertDetectedLanguage(normalizedLang)
    }

    const compLang = options.ignoreCase ? normalizedLang.toLowerCase() : normalizedLang
    const compSupported = options.supportedLanguages.map((l) =>
      options.ignoreCase ? l.toLowerCase() : l
    )

    const matchedLang = compSupported.find((l) => l === compLang)
    return matchedLang ? options.supportedLanguages[compSupported.indexOf(matchedLang)] : undefined
  } catch {
    return undefined
  }
}

/**
 * Detects language from query parameter
 */
export function detectFromQuery(c: Context, options: DetectorOptions): string | undefined {
  try {
    const query = c.req.query(options.lookupQuerystring)
    return normalizeLanguage(query, options)
  } catch {
    return undefined
  }
}

/**
 * Detects language from cookie
 */
export function detectFromCookie(c: Context, options: DetectorOptions): string | undefined {
  try {
    const cookie = getCookie(c, options.lookupCookie)
    return normalizeLanguage(cookie, options)
  } catch {
    return undefined
  }
}

/**
 * Detects language from Accept-Language header
 */
export function detectFromHeader(c: Context, options: DetectorOptions): string | undefined {
  try {
    const acceptLanguage = c.req.header(options.lookupFromHeaderKey)
    if (!acceptLanguage) {
      return undefined
    }

    const languages = parseAcceptLanguage(acceptLanguage)
    for (const { lang } of languages) {
      const normalizedLang = normalizeLanguage(lang, options)
      if (normalizedLang) {
        return normalizedLang
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Detects language from URL path
 */
export function detectFromPath(c: Context, options: DetectorOptions): string | undefined {
  try {
    const pathSegments = c.req.path.split('/').filter(Boolean)
    const langSegment = pathSegments[options.lookupFromPathIndex]
    return normalizeLanguage(langSegment, options)
  } catch {
    return undefined
  }
}

/**
 * Collection of all language detection strategies
 */
export const detectors = {
  querystring: detectFromQuery,
  cookie: detectFromCookie,
  header: detectFromHeader,
  path: detectFromPath,
} as const

/** Type for detector functions */
export type DetectorFunction = (c: Context, options: DetectorOptions) => string | undefined

/** Type-safe detector map */
export type Detectors = Record<keyof typeof detectors, DetectorFunction>

/**
 * Validate detector options
 * @param options Detector options to validate
 * @throws Error if options are invalid
 */
export function validateOptions(options: DetectorOptions): void {
  if (!options.supportedLanguages.includes(options.fallbackLanguage)) {
    throw new Error('Fallback language must be included in supported languages')
  }

  if (options.lookupFromPathIndex < 0) {
    throw new Error('Path index must be non-negative')
  }

  if (!options.order.every((detector) => Object.keys(detectors).includes(detector))) {
    throw new Error('Invalid detector type in order array')
  }
}

/**
 * Cache detected language
 */
function cacheLanguage(c: Context, language: string, options: DetectorOptions): void {
  if (!Array.isArray(options.caches) || !options.caches.includes('cookie')) {
    return
  }

  try {
    setCookie(c, options.lookupCookie, language, options.cookieOptions)
  } catch (error) {
    if (options.debug) {
      console.error('Failed to cache language:', error)
    }
  }
}

/**
 * Detect language from request
 */
function detectLanguage(c: Context, options: DetectorOptions): string {
  let detectedLang: string | undefined

  for (const detectorName of options.order) {
    const detector = detectors[detectorName]
    if (!detector) {
      continue
    }

    try {
      detectedLang = detector(c, options)
      if (detectedLang) {
        if (options.debug) {
          console.log(`Language detected from ${detectorName}: ${detectedLang}`)
        }
        break
      }
    } catch (error) {
      if (options.debug) {
        console.error(`Error in ${detectorName} detector:`, error)
      }
      continue
    }
  }

  const finalLang = detectedLang || options.fallbackLanguage

  if (detectedLang && options.caches) {
    cacheLanguage(c, finalLang, options)
  }

  return finalLang
}

/**
 * Language detector middleware factory
 * @param userOptions Configuration options for the language detector
 * @returns Hono middleware function
 */
export function languageDetector(userOptions: Partial<DetectorOptions> = {}): MiddlewareHandler {
  const options: DetectorOptions = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    cookieOptions: {
      ...DEFAULT_OPTIONS.cookieOptions,
      ...userOptions.cookieOptions,
    },
  }

  validateOptions(options)

  return async function languageDetectorMiddleware(c, next) {
    try {
      const lang = detectLanguage(c, options)
      c.set('language', lang)
    } catch (error) {
      if (options.debug) {
        console.error('Language detection failed:', error)
      }
      c.set('language', options.fallbackLanguage)
    }

    await next()
  }
}
