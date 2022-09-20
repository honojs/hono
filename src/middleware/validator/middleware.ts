import type { Context } from '../../context'
import type { Environment, Handler } from '../../hono'
import { VBase, Validator } from './validator'
import type { VString, VNumber, VBoolean, VObject, ValidateResult } from './validator'

type ValidationFunction<T> = (v: Validator, c: Context) => T

type Schema = {
  [key: string]: VString | VNumber | VBoolean | VObject | Schema
}
type SchemaToProp<T> = {
  [K in keyof T]: T[K] extends VNumber
    ? number
    : T[K] extends VBoolean
    ? boolean
    : T[K] extends VString
    ? string
    : T[K] extends VObject
    ? object
    : T[K] extends Schema
    ? SchemaToProp<T[K]>
    : never
}

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done = (resultSet: ResultSet, context: Context) => Response | void

function getValidatorList<T extends Schema>(schema: T): [string[], VBase][] {
  const map: [string[], VBase][] = []
  for (const [key, value] of Object.entries(schema)) {
    if (value instanceof VBase) {
      map.push([[key], value])
    } else {
      const children = getValidatorList(value)
      for (const [keys, validator] of children) {
        map.push([[key, ...keys], validator])
      }
    }
  }
  return map
}

export const validatorMiddleware = <T extends Schema>(
  validationFunction: ValidationFunction<T>,
  options?: { done?: Done }
) => {
  const v = new Validator()

  const handler: Handler<string, Environment, SchemaToProp<T>> = async (c, next) => {
    const resultSet: ResultSet = {
      hasError: false,
      messages: [],
      results: [],
    }

    const validatorList = getValidatorList(validationFunction(v, c))

    for (const [keys, validator] of validatorList) {
      const result = await validator.validate(c.req)
      if (result.isValid) {
        // Set data on request object
        c.req.valid(keys, result.value)
      } else {
        resultSet.hasError = true
        if (result.message !== undefined) {
          resultSet.messages.push(result.message)
        }
      }
      resultSet.results.push(result)
    }

    if (options && options.done) {
      const res = options.done(resultSet, c)
      if (res) {
        return res
      }
    }

    if (resultSet.hasError) {
      return c.text(resultSet.messages.join('\n'), 400)
    }
    await next()
  }
  return handler
}
