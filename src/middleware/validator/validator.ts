// Some validation rules is are based on Validator.js
// Validator.js
// License (MIT)
// Copyright (c) 2018 Chris O'Hara <cohara87@gmail.com>
// https://github.com/validatorjs/validator.js

const isString = (value: any) => {
  return typeof value === 'string'
}

export const validator = {
  required(value: unknown): boolean {
    if (value === undefined) return false
    if (isString(value) && value === '') return false
    return true
  },

  optional(): boolean {
    return true
  },

  isBoolean(value: unknown): boolean {
    return typeof value === 'boolean'
  },

  isNumber(value: unknown): boolean {
    return typeof value === 'number'
  },

  isFalsy(value: unknown): boolean {
    return !value
  },

  isNotFalsy(value: unknown): boolean {
    return !!value
  },

  isAlpha(value: string): boolean {
    return isString(value) && value.match(/^[A-Z]+$/i) ? true : false
  },

  isNumeric(value: string): boolean {
    return isString(value) && value.match(/^[0-9]+$/) ? true : false
  },

  isEmpty(
    value: string,
    options: {
      ignore_whitespace: boolean
    } = { ignore_whitespace: false }
  ): boolean {
    return (isString(value) && options.ignore_whitespace ? value.trim().length : value.length) === 0
  },

  isLength(value: string, options: Partial<{ min: number; max: number }> | number, arg2?: number) {
    if (!isString(value)) return false
    let min: number
    let max: number | undefined
    if (typeof options === 'object') {
      min = options.min || 0
      max = options.max
    } else {
      // backwards compatibility: isLength(str, min [, max])
      min = options || 0
      max = arg2
    }
    const presentationSequences = value.match(/(\uFE0F|\uFE0E)/g) || []
    const surrogatePairs = value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []
    const len = value.length - presentationSequences.length - surrogatePairs.length
    return len >= min && (typeof max === 'undefined' || len <= max)
  },

  contains(
    value: string,
    elem: string,
    options: Partial<{ ignoreCase: boolean; minOccurrences: number }> = {
      ignoreCase: false,
      minOccurrences: 1,
    }
  ): boolean {
    options.ignoreCase ||= false
    options.minOccurrences ||= 1
    if (!isString(value) || !isString(elem)) return false
    if (options.ignoreCase) {
      return value.toLowerCase().split(elem.toLowerCase()).length > options.minOccurrences
    }
    return value.split(elem).length > options.minOccurrences
  },

  equals(value: unknown, comparison: unknown): boolean {
    return value === comparison
  },

  isIn(value: string, options: string[]): boolean {
    if (!isString(value)) return false
    if (typeof options === 'object') {
      for (const elem of options) {
        if (elem === value) return true
      }
    }
    return false
  },

  trim(value: string): string {
    return isString(value) ? value.trim() : value
  },
}
