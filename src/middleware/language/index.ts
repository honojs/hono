import type { LanguageVariables, DetectorOptions, DetectorType, CacheType } from './language'
export type { LanguageVariables, DetectorOptions, DetectorType, CacheType }
export {
  languageDetector,
  detectFromCookie,
  detectFromHeader,
  detectFromPath,
  detectFromQuery,
  DEFAULT_OPTIONS,
} from './language'
declare module '../..' {
  interface ContextVariableMap extends LanguageVariables {}
}
