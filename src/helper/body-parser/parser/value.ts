import { BodyParser } from '..'
import { CHARSET, CHARSET_SENTINEL, ISO_SENTINEL } from './constant'
import { decoder, hasProperty, mapAndDecode } from './helper'

export const parseValues = <T>(val: T) => {
  if (val && typeof val === 'string' && BodyParser.options.splitByComma && val.indexOf(',') > -1) {
    return val.split(',') as never[]
  }

  return val
}

export const parseValue = (value: string) => {
  const obj: Record<string, unknown | unknown[]> = {
    __proto__: null,
  }
  const chunks = value.split('&', BodyParser.options.parameterLimit)

  // Track where the `utf8=` was found
  const skipIndex: number = chunks.findIndex((val) => val.indexOf('utf8=') !== -1)
  let charset: string

  // eslint-disable-next-line default-case
  switch (chunks[skipIndex]) {
    case ISO_SENTINEL:
      charset = CHARSET.ISO
      break

    case CHARSET_SENTINEL:
    default:
      charset = CHARSET.UTF8
      break
  }

  for (let i = 0; i < chunks.length; ++i) {
    // eslint-disable-next-line no-continue
    if (i === skipIndex) continue

    const part = chunks[i]
    const bracketEqualsPos = part.indexOf(']=')
    const pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1

    let key: string
    let val: unknown | unknown[]

    if (pos === -1) {
      key = decoder(part, charset)
      val = ''
    } else {
      key = decoder(part.slice(0, pos), charset)
      val = mapAndDecode(parseValues(part.slice(pos + 1)), charset)
    }

    if (part.indexOf('[]=') > -1) {
      val = Array.isArray(val) ? [val] : val
    }

    if (hasProperty.call(obj, key)) {
      obj[key] = ([] as unknown[]).concat(obj[key], val)
    } else {
      obj[key] = val
    }
  }

  return obj
}
