import type { MiddlewareHandler } from '../..'

interface AcceptLanguage {
  lang: string
  q: number
}

interface I18nOptions {
  defaultLang: string
  supportedLangs: string[]
  targetHeader?: string
  langMatch?: (
    acceptLanguages: AcceptLanguage[],
    config: {
      defaultLang: string
      supportedLangs: string[]
    }
  ) => string | undefined
}

const DEFAULT_TARGET_HEADER = 'accept-language'

export const validateQ = (q: string): number => {
  const qFloat = parseFloat(q)
  if (!isNaN(qFloat) && qFloat >= 0 && qFloat <= 1) {
    return qFloat
  }
  return 1
}

export const parseAcceptLanguage = (acceptLanguage: string): AcceptLanguage[] => {
  if (acceptLanguage === '') {
    return [{ lang: '*', q: 1 }]
  }
  return acceptLanguage.split(',').map((item) => {
    const [lang, q] = item.split(';q=')
    return { lang, q: validateQ(q) }
  })
}

export const simpleLangMatch = (
  acceptLanguages: AcceptLanguage[],
  config: {
    defaultLang: string
    supportedLangs: string[]
  }
) => {
  const supportedLangs = config.supportedLangs.map((lang) => lang.toLowerCase())
  acceptLanguages = acceptLanguages.sort((a, b) => b.q - a.q)
  for (const item of acceptLanguages) {
    if (item.lang === '*') {
      return config.defaultLang
    }
    if (supportedLangs.includes(item.lang.toLowerCase())) {
      return item.lang
    }
  }
  return config.defaultLang
}

declare module '../../context' {
  interface ContextVariableMap {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lang: any
  }
}

export const i18n = (options: I18nOptions): MiddlewareHandler => {
  const { defaultLang, supportedLangs, targetHeader, langMatch = simpleLangMatch } = options

  return async (c, next) => {
    const lang = c.req.header(targetHeader ?? DEFAULT_TARGET_HEADER) ?? ''
    c.set('lang', langMatch(parseAcceptLanguage(lang), { defaultLang, supportedLangs }))
    await next()
    return
  }
}
