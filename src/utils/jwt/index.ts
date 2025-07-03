/**
 * @module
 * JWT utility.
 */

import { decode, sign, verify, verifyFromJwks } from './jwt'
export const Jwt = { sign, verify, decode, verifyFromJwks }
