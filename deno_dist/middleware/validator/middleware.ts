import type { Context } from '../../context.ts'
import type { Environment, MiddlewareHandler } from '../../types.ts'
import { getStatusText } from '../../utils/http-status.ts'
import { mergeObjects } from '../../utils/object.ts'
import type { Schema } from '../../validator/schema.ts'
import type { ValidateResult } from '../../validator/validator.ts'
import { Validator, VBase, VObjectBase } from '../../validator/validator.ts'

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done<P extends string, E extends Partial<Environment> = Environment> = (
  resultSet: ResultSet,
  c: Context<P, E>
) => Response | void

type ValidationFunction<
  P extends string,
  E extends Partial<Environment> = Environment,
  S extends Schema = Schema
> = (v: Validator, c: Context<P, E>) => S

export const validatorMiddleware = <
  P extends string,
  E extends Partial<Environment> = Environment,
  S extends Schema = Schema
>(
  validationFunction: ValidationFunction<P, E, S>,
  options?: { done?: Done<P, E> }
) => {
  const v = new Validator()
  const handler: MiddlewareHandler<string, E, S> = async (c, next) => {
    const resultSet: ResultSet = {
      hasError: false,
      messages: [],
      results: [],
    }

    const schema = validationFunction(v, c)
    const validatorList = getValidatorList(schema)
    let data: any = {}

    for (const [keys, validator] of validatorList) {
      let results: ValidateResult[]
      try {
        results = await validator.validate(c.req as Request)
      } catch (e) {
        // Invalid JSON request
        if (e instanceof Error) {
          const result = getErrorResult(e)
          resultSet.hasError = true
          resultSet.messages = [result.message || '']
          resultSet.results = [result]
          break
        } else {
          return c.text(getStatusText(400), 400)
        }
      }

      let isValid = true
      const value = results[0].value
      const jsonData = results[0].jsonData

      for (const result of results) {
        if (!result.isValid) {
          isValid = false
          resultSet.hasError = true
          if (result.ruleType === 'value' && result.message !== undefined) {
            resultSet.messages.push(result.message)
          }
        }
        resultSet.results.push(result)
      }

      // If it's invalid but it has no "value" messages, have to set the "type" messages.
      // This approach is verbose, but if do not so, the response body will be empty.
      if (!isValid && resultSet.messages.length === 0) {
        resultSet.results.map((r) => {
          if (!r.isValid && r.ruleType === 'type' && r.message) {
            resultSet.messages.push(r.message)
          }
        })
      }

      // Set data on request object
      if (isValid) {
        // Set data on request object
        if (jsonData) {
          const dst = data
          data = mergeObjects(dst, jsonData)
        } else {
          c.req.valid(keys, value)
        }
      }
    }

    if (!resultSet.hasError) {
      Object.keys(data).map((key) => {
        c.req.valid(key, data[key])
      })
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

function getValidatorList<T extends Schema>(schema: T) {
  const map: [string[], VBase][] = []
  for (const [key, value] of Object.entries(schema)) {
    if (value instanceof VObjectBase) {
      const validators = value.getValidators()
      for (const validator of validators) {
        map.push([value.keys, validator])
      }
    } else if (value instanceof VBase) {
      map.push([[key], value])
    } else {
      const children = getValidatorList(value as Schema)
      for (const [keys, validator] of children) {
        map.push([[key, ...keys], validator])
      }
    }
  }
  return map
}

const getErrorResult = (e: Error) => {
  const result: ValidateResult = {
    isValid: false,
    message: e.message,
    target: 'unknown',
    key: null,
    value: null,
    ruleName: e.message,
    ruleType: 'value',
  }
  return result
}
