import type { LanguageVariables, DetectorType, CacheType } from './language'
export type { LanguageVariables, DetectorType, CacheType }
export {
  languageDetector,
  DetectorOptions,
  detectFromCookie,
  detectFromHeader,
  detectFromPath,
  detectFromQuery,
  DEFAULT_OPTIONS,
} from './language'
declare module '../..' {
  interface ContextVariableMap extends LanguageVariables {}
}
