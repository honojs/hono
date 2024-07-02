import type { RequestIDVariables } from './request-id'
export type { RequestIDVariables }
export { requestID } from './request-id'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends RequestIDVariables {}
}
