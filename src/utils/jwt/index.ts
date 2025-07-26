/**
 * @module
 * JWT utility.
 */

import { decode, sign, verify, verifyWithJwks } from './jwt'
export const Jwt = { sign, verify, decode, verifyWithJwks }
