import { JSONPath } from '../../utils/json.ts'
import type { JSONObject, JSONPrimative, JSONArray } from '../../utils/json.ts'
import { rule } from './rule.ts'
import { sanitizer } from './sanitizer.ts'

type Target = 'query' | 'header' | 'body' | 'json'
type Type = JSONPrimative | JSONObject | JSONArray | File
type Rule = (value: Type) => boolean
type Sanitizer = (value: Type) => Type

export class Validator {
  query = (key: string): VString => new VString({ target: 'query', key: key })
  header = (key: string): VString => new VString({ target: 'header', key: key })
  body = (key: string): VString => new VString({ target: 'body', key: key })
  json = (key: string): VString => new VString({ target: 'json', key: key })
}

export type ValidateResult = {
  isValid: boolean
  message: string | undefined
  target: Target
  key: string
  value: Type
}

type VOptions = {
  target: Target
  key: string
  type?: 'string' | 'number' | 'boolean' | 'object'
}

export abstract class VBase {
  type: 'string' | 'number' | 'boolean' | 'object'
  target: Target
  key: string
  rules: Rule[]
  sanitizers: Sanitizer[]
  private _message: string | undefined
  private _optional: boolean

  constructor(options: VOptions) {
    this.target = options.target
    this.key = options.key
    this.type = options.type || 'string'
    this.rules = []
    this.sanitizers = []
    this._optional = false
  }

  addRule = (rule: Rule) => {
    this.rules.push(rule)
    return this
  }

  addSanitizer = (sanitizer: Sanitizer) => {
    this.sanitizers.push(sanitizer)
    return this
  }

  isRequired = () => {
    return this.addRule((value: unknown) => {
      if (value !== undefined && value !== null && value !== '') return true
      return false
    })
  }

  isOptional = () => {
    this._optional = true
    return this.addRule(() => true)
  }

  isEqual = (comparison: unknown) => {
    return this.addRule((value: unknown) => {
      return value === comparison
    })
  }

  asNumber = () => {
    const newVNumber = new VNumber(this)
    return newVNumber
  }

  asBoolean = () => {
    const newVBoolean = new VBoolean(this)
    return newVBoolean
  }

  asObject = () => {
    const newVObject = new VObject(this)
    return newVObject
  }

  message(value: string) {
    this._message = value
    return this
  }

  validate = async (req: Request): Promise<ValidateResult> => {
    const result: ValidateResult = {
      isValid: true,
      message: undefined,
      target: this.target,
      key: this.key,
      value: undefined,
    }

    let value: Type = undefined
    if (this.target === 'query') {
      value = req.query(this.key)
    }
    if (this.target === 'header') {
      value = req.header(this.key)
    }
    if (this.target === 'body') {
      const body = await req.parseBody()
      value = body[this.key]
    }
    if (this.target === 'json') {
      const obj = (await req.json()) as JSONObject
      value = JSONPath(obj, this.key)
    }

    result.value = value
    result.isValid = this.validateValue(value)

    if (result.isValid == false) {
      if (this._message) {
        result.message = this._message
      } else {
        const valToStr = Array.isArray(value)
          ? `[${value
              .map((val) =>
                val === undefined ? 'undefined' : typeof val === 'string' ? `"${val}"` : val
              )
              .join(', ')}]`
          : value
        switch (this.target) {
          case 'query':
            result.message = `Invalid Value: the query parameter "${this.key}" is invalid - ${valToStr}`
            break
          case 'header':
            result.message = `Invalid Value: the request header "${this.key}" is invalid - ${valToStr}`
            break
          case 'body':
            result.message = `Invalid Value: the request body "${this.key}" is invalid - ${valToStr}`
            break
          case 'json':
            result.message = `Invalid Value: the JSON body "${this.key}" is invalid - ${valToStr}`
            break
        }
      }
    }
    return result
  }

  private validateValue = (value: Type): boolean => {
    // Check type
    if (Array.isArray(value)) {
      for (const val of value) {
        if (typeof val !== this.type) {
          // Value is of wrong type here
          // If not optional, or optional and not undefined, return false
          if (!this._optional || typeof val !== 'undefined') return false
        }
      }

      // Sanitize
      for (const sanitizer of this.sanitizers) {
        value = value.map((innerVal) => sanitizer(innerVal)) as JSONArray
      }

      for (const rule of this.rules) {
        for (const val of value) {
          if (!rule(val)) {
            return false
          }
        }
      }
      return true
    } else {
      if (typeof value !== this.type) {
        if (this._optional && typeof value === 'undefined') {
          // Do nothing.
          // The value is allowed to be `undefined` if it is `optional`
        } else {
          return false
        }
      }

      // Sanitize
      for (const sanitizer of this.sanitizers) {
        value = sanitizer(value)
      }

      for (const rule of this.rules) {
        if (!rule(value)) {
          return false
        }
      }
      return true
    }
  }
}

export class VString extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'string'
  }

  isEmpty = (
    options: {
      ignore_whitespace: boolean
    } = { ignore_whitespace: false }
  ) => {
    return this.addRule((value) => rule.isEmpty(value as string, options))
  }

  isLength = (options: Partial<{ min: number; max: number }> | number, arg2?: number) => {
    return this.addRule((value) => rule.isLength(value as string, options, arg2))
  }

  isAlpha = () => {
    return this.addRule((value) => rule.isAlpha(value as string))
  }

  isNumeric = () => {
    return this.addRule((value) => rule.isNumeric(value as string))
  }

  contains = (
    elem: string,
    options: Partial<{ ignoreCase: boolean; minOccurrences: number }> = {
      ignoreCase: false,
      minOccurrences: 1,
    }
  ) => {
    return this.addRule((value) => rule.contains(value as string, elem, options))
  }

  isIn = (options: string[]) => {
    return this.addRule((value) => rule.isIn(value as string, options))
  }

  match = (regExp: RegExp) => {
    return this.addRule((value) => rule.match(value as string, regExp))
  }

  trim = () => {
    return this.addSanitizer((value) => sanitizer.trim(value as string))
  }
}

export class VNumber extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'number'
  }

  isGte = (min: number) => {
    return this.addRule((value) => rule.isGte(value as number, min))
  }

  isLte = (min: number) => {
    return this.addRule((value) => rule.isLte(value as number, min))
  }
}

export class VBoolean extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'boolean'
  }

  isTrue = () => {
    return this.addRule((value) => rule.isTrue(value as boolean))
  }

  isFalse = () => {
    return this.addRule((value) => rule.isFalse(value as boolean))
  }
}

export class VObject extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'object'
  }
}
