export type { ContentSecurityPolicyOptionHandler } from './secure-headers'
export { NONCE, secureHeaders } from './secure-headers'
import type { SecureHeadersVariables } from './secure-headers'

declare module '../../context' {
  interface ContextVariableMap extends SecureHeadersVariables {}
}
