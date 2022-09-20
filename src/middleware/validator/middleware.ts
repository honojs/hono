import type { Context } from '../../context'
import type { Environment, Handler } from '../../hono'
import { Validator } from './validator'
import type { VString, VNumber, VBoolean, VObject, ValidateResult } from './validator'

type ValidationFunction<T> = (v: Validator, c: Context) => T

type Schema = Record<string, VString | VNumber | VBoolean | VObject>
type SchemaToProp<T> = {
  [K in keyof T]: T[K] extends VNumber
    ? number
    : T[K] extends VBoolean
    ? boolean
    : T[K] extends VString
    ? string
    : T[K] extends VObject
    ? object
    : never
}

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done = (resultSet: ResultSet, context: Context) => Response | void

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

    const schema = validationFunction(v, c)

    for (const key of Object.keys(schema)) {
      const validator = schema[key]
      const result = await validator.validate(c.req)
      if (result.isValid) {
        // Set data on request object
        c.req.valid(key, result.value)
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
