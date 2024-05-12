import '../../context'
import type { JwtVariables } from './jwt'
export { jwt, verify, decode, sign } from './jwt'

declare module '../../context' {
  interface ContextVariableMap extends JwtVariables {}
}
