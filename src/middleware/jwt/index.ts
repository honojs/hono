import type { JwtVariables } from './jwt'
export type { JwtVariables }
export { jwt, verifyWithJwks, verify, decode, sign } from './jwt'
export { AlgorithmTypes } from '../../utils/jwt/jwa'
import type {} from '../..'

declare module '../..' {
  interface ContextVariableMap extends JwtVariables {}
}
