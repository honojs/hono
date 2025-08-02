import type { JwtVariables } from './jwt'
export type { JwtVariables }
export { jwt, verifyWithJwks, verify, decode, sign } from './jwt'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends JwtVariables {}
}
