import type { RequestIdVariables } from './request-id'
export type { RequestIdVariables }
export { requestId } from './request-id'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends RequestIdVariables {}
}
