import { BodyParser } from '..'
import { hasProperty } from './helper'
import { parseObject } from './object'

export const parseKeys = <T extends Record<string, unknown | unknown[]>>(
  passedKey: string,
  value: T,
  valueParsed: boolean
) => {
  if (!passedKey) return

  const key = passedKey.replace(/\.([^.[]+)/g, '[$1]')
  const brackets = /(\[[^[\]]*])/
  const child = /(\[[^[\]]*])/g

  const objectDepth = BodyParser.options.depth

  let segment = objectDepth > 0 && brackets.exec(key)
  const parent = segment ? key.slice(0, segment.index) : key
  const keys: string[] = []

  if (parent) {
    if (hasProperty.call(Object.prototype, parent) && !BodyParser.options.allowPrototypes) {
      return
    }

    keys.push(parent)
  }

  let i = 0
  while (
    objectDepth > 0 &&
    // eslint-disable-next-line no-cond-assign
    (segment = child.exec(key)) !== null &&
    i < objectDepth
  ) {
    i += 1

    if (
      hasProperty.call(Object.prototype, segment[1].slice(1, -1)) &&
      !BodyParser.options.allowPrototypes
    ) {
      return
    }

    keys.push(segment[1])
  }

  if (segment) {
    keys.push(`[${key.slice(segment.index)}]`)
  }

  return parseObject(keys, value, valueParsed)
}
