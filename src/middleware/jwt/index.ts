import type { JwtVariables } from './jwt'
export { jwt, verify, decode, sign } from './jwt'

declare module '../..' {
  interface ContextVariableMap extends JwtVariables {}
}
