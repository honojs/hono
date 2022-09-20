// Some validation rules is are based on Validator.js
// Validator.js
// License (MIT)
// Copyright (c) 2018 Chris O'Hara <cohara87@gmail.com>
// https://github.com/validatorjs/validator.js

export const rule = {
  // string
  isEmpty(
    value: string,
    options: {
      ignore_whitespace: boolean
    } = { ignore_whitespace: false }
  ): boolean {
    return (options.ignore_whitespace ? value.trim().length : value.length) === 0
  },

  isLength: (
    value: string,
    options: Partial<{ min: number; max: number }> | number,
    arg2?: number
  ) => {
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

  isAlpha: (value: string): boolean => {
    return /^[A-Z]+$/i.test(value)
  },

  isNumeric: (value: string): boolean => {
    return /^[0-9]+$/.test(value)
  },

  contains: (
    value: string,
    elem: string,
    options: Partial<{ ignoreCase: boolean; minOccurrences: number }> = {
      ignoreCase: false,
      minOccurrences: 1,
    }
  ): boolean => {
    options.ignoreCase ||= false
    options.minOccurrences ||= 1
    if (options.ignoreCase) {
      return value.toLowerCase().split(elem.toLowerCase()).length > options.minOccurrences
    }
    return value.split(elem).length > options.minOccurrences
  },

  isIn: (value: string, options: string[]): boolean => {
    if (typeof options === 'object') {
      for (const elem of options) {
        if (elem === value) return true
      }
    }
    return false
  },

  match: (value: string, regExp: RegExp): boolean => {
    return regExp.test(value)
  },

  // number
  isGte: (value: number, min: number) => min <= value,
  isLte: (value: number, max: number) => value <= max,

  // boolean
  isTrue: (value: boolean) => value === true,
  isFalse: (value: boolean) => value === false,
}
