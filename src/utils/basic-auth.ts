import { decodeBase64 } from './encode'

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const USER_PASS_REGEXP = /^([^:]*):(.*)$/
const utf8Decoder = new TextDecoder()

export type Auth = (req: Request) => { username: string; password: string } | undefined

export const auth: Auth = (req: Request) => {
  const match = CREDENTIALS_REGEXP.exec(req.headers.get('Authorization') || '')
  if (!match) {
    return undefined
  }

  let userPass = undefined
  // If an invalid string is passed to atob(), it throws a `DOMException`.
  try {
    userPass = USER_PASS_REGEXP.exec(utf8Decoder.decode(decodeBase64(match[1])))
  } catch {} // Do nothing

  if (!userPass) {
    return undefined
  }

  return { username: userPass[1], password: userPass[2] }
}
