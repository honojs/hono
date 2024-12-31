import type { LanguageVariables, DetectorType, CacheType } from './language'
export type { LanguageVariables, DetectorType, CacheType }
export {
  languageDetector,
  DetectorOptions,
  detectFromCookie,
  detectFromHeader,
  detectFromPath,
  detectFromQuery,
} from './language'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends LanguageVariables {}
}
