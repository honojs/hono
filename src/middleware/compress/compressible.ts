// credits: https://github.com/jshttp/compressible

import db from './compressible-types'

const COMPRESSIBLE_TYPE_REGEXP = /^text\/|\+(?:json|text|xml)$/i
const EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/

export default function compressible(type: string): boolean {
  if (!type || typeof type !== 'string') {
    return false
  }

  // strip parameters
  const match = EXTRACT_TYPE_REGEXP.exec(type)
  const mime = match && match[1].toLowerCase()

  if (!mime) {
    return false
  }

  return db.has(mime) || COMPRESSIBLE_TYPE_REGEXP.test(mime)
}
