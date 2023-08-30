import { BodyParser } from '../index.ts'
import { CHARSET } from './constant.ts'

export const hasProperty = Object.prototype.hasOwnProperty

export const decoder = (str: string, charset: string) => {
  const strWithoutPlus = str.replace(/\+/g, ' ')

  if (charset === CHARSET.ISO) {
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape)
  }

  // utf-8
  try {
    return decodeURIComponent(strWithoutPlus)
  } catch {
    return strWithoutPlus
  }
}

export const mapAndDecode = (value: string | string[], charset: string) => {
  if (Array.isArray(value)) {
    const mapped: string[] = []

    for (let i = 0; i < value.length; ++i) {
      mapped.push(decoder(value[i], charset))
    }

    return mapped
  }

  return decoder(value, charset)
}

const arrayToObject = (source: unknown[]) => {
  const obj: Record<string, unknown> = {}

  for (let i = 0; i < source.length; ++i) {
    if (typeof source[i] !== 'undefined') {
      obj[i] = source[i]
    }
  }

  return obj
}

export const merge = <T, U>(target: T, source: U) => {
  if (!source) {
    return target
  }

  if (typeof source !== 'object') {
    if (Array.isArray(target)) {
      target.push(source)
    } else if (target && typeof target === 'object') {
      if (
        BodyParser.options.allowPrototypes ||
        !hasProperty.call(Object.prototype, source as string)
      ) {
        target[source as keyof typeof target] = true as never
      }
    } else {
      return [target, source]
    }

    return target
  }

  if (!target || typeof target !== 'object') {
    return [target].concat(source as never)
  }

  let mergeTarget = target
  if (Array.isArray(target) && !Array.isArray(source)) {
    mergeTarget = arrayToObject(target) as typeof mergeTarget
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    source.forEach((item, i) => {
      if (hasProperty.call(target, i)) {
        const targetItem = target[i]
        if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
          target[i] = merge(targetItem, item)
        } else {
          target.push(item)
        }
      } else {
        target[i] = item
      }
    })
    return target
  }

  return Object.keys(source).reduce((acc, key) => {
    const value = source[key as never]
    const curr = acc[key as never]

    if (hasProperty.call(acc, key)) {
      acc[key as never] = merge(curr, value as never) as never
    } else {
      acc[key as never] = value as never
    }

    return acc
  }, mergeTarget)
}
