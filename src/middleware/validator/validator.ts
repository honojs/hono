import { JSONPathCopy } from '../../utils/json'
import type { JSONObject, JSONPrimitive, JSONArray } from '../../utils/json'
import type { Schema } from './middleware'
import { rule } from './rule'
import { sanitizer } from './sanitizer'

type Target = 'query' | 'header' | 'body' | 'json'
type Type = JSONPrimitive | JSONObject | JSONArray | File
type Rule = (value: Type) => boolean
type Sanitizer = (value: Type) => Type

export abstract class VObjectBase<T extends Schema> {
  container: T
  keys: string[] = []
  protected _isOptional: boolean = false
  constructor(container: T, key: string) {
    this.container = container
    if (this instanceof VArray) {
      this.keys.push(key, '[*]')
    } else if (this instanceof VObject) {
      this.keys.push(key)
    }
  }
  isOptional() {
    this._isOptional = true
    return this
  }

  getValidators = (): VBase[] => {
    const validators: VBase[] = []
    const thisKeys: string[] = []
    Object.assign(thisKeys, this.keys)

    const walk = (container: T, keys: string[], isOptional: boolean) => {
      for (const v of Object.values(container)) {
        if (v instanceof VArray || v instanceof VObject) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          isOptional ||= v._isOptional
          keys.push(...v.keys)
          walk(v.container as T, keys, isOptional)
          const tmp: string[] = []
          Object.assign(tmp, thisKeys)
          keys = tmp
        } else if (v instanceof VBase) {
          if (isOptional) v.isOptional()
          v.baseKeys.push(...keys)
          validators.push(v)
        }
      }
    }

    walk(this.container, this.keys, this._isOptional)

    return validators
  }
}

export class VObject<T extends Schema> extends VObjectBase<T> {
  constructor(container: T, key: string) {
    super(container, key)
  }
}

export class VArray<T extends Schema> extends VObjectBase<T> {
  type: 'array' = 'array'
  constructor(container: T, key: string) {
    super(container, key)
  }
}

export class Validator {
  isArray: boolean = false
  isOptional: boolean = false
  query = (key: string): VString => new VString({ target: 'query', key: key })
  header = (key: string): VString => new VString({ target: 'header', key: key })
  body = (key: string): VString => new VString({ target: 'body', key: key })
  json = (key: string) => {
    if (this.isArray) {
      return new VStringArray({ target: 'json', key: key })
    } else {
      return new VString({ target: 'json', key: key })
    }
  }
  array = <T extends Schema>(path: string, validator: (v: Validator) => T): VArray<T> => {
    this.isArray = true
    const res = validator(this)
    const arr = new VArray(res, path)
    return arr
  }
  object = <T extends Schema>(path: string, validator: (v: Validator) => T): VObject<T> => {
    const res = validator(this)
    const obj = new VObject(res, path)
    return obj
  }
}

export type ValidateResult = {
  isValid: boolean
  message: string | undefined
  target: Target
  key: string
  value: Type
  jsonData: JSONObject | undefined
}

type VOptions = {
  target: Target
  key: string
  type?: 'string' | 'number' | 'boolean' | 'object'
  isArray?: boolean
}

export abstract class VBase {
  type: 'string' | 'number' | 'boolean' | 'object'
  target: Target
  baseKeys: string[] = []
  key: string
  rules: Rule[]
  sanitizers: Sanitizer[]
  isArray: boolean
  private _message: string | undefined
  private _optional: boolean
  constructor(options: VOptions) {
    this.target = options.target
    this.key = options.key
    this.type = options.type || 'string'
    this.rules = []
    this.sanitizers = []
    this.isArray = options.isArray || false
    this._optional = false
  }

  private _nested = () => (this.baseKeys.length ? true : false)

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
      jsonData: undefined,
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
      if (this._nested()) {
        this.key = `${this.baseKeys.join('.')}.${this.key}`
      }
      let obj = {}
      try {
        obj = (await req.json()) as JSONObject
      } catch (e) {
        throw new Error('Malformed JSON in request body')
      }
      const dst = {}
      value = JSONPathCopy(obj, dst, this.key)
      if (this.isArray && !Array.isArray(value)) {
        value = [value]
      }
      if (this._nested()) result.jsonData = dst
    }

    result.value = value

    if (this._nested() && this.target != 'json') {
      result.isValid = false
    } else {
      result.isValid = this.validateValue(value)
    }

    if (result.isValid === false) {
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
    if (this.isArray) {
      if (!Array.isArray(value)) {
        return false
      }

      for (const val of value) {
        if (typeof val === 'undefined' && this._nested()) {
          value.pop()
        }
        for (const val of value) {
          if (typeof val !== this.type) {
            // Value is of wrong type here
            // If not optional, or optional and not undefined, return false
            if (!this._optional || typeof val !== 'undefined') return false
          }
        }
      }

      // Sanitize
      for (const sanitizer of this.sanitizers) {
        value = value.map((innerVal: any) => sanitizer(innerVal)) as JSONArray
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

  asArray = () => {
    return new VStringArray(this)
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

  asArray = () => {
    return new VNumberArray(this)
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

  asArray = () => {
    return new VBooleanArray(this)
  }

  isTrue = () => {
    return this.addRule((value) => rule.isTrue(value as boolean))
  }

  isFalse = () => {
    return this.addRule((value) => rule.isFalse(value as boolean))
  }
}

export class VNumberArray extends VNumber {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
  }
}
export class VStringArray extends VString {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
  }
}
export class VBooleanArray extends VBoolean {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
  }
}
