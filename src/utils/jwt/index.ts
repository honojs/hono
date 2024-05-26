/**
 * @module
 * JWT utility.
 */

import { decode, sign, verify } from './jwt'
export const Jwt = { sign, verify, decode }
