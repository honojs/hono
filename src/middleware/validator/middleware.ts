import type { Context } from '../../context'
import type { Handler } from '../../hono'
import { JSONPathCopy } from '../../utils/json'

type Param =
  | string
  | number
  | string[]
  | number[]
  | Record<string, string | number>
  | ValidatorMessage
type Rule = Function | [Function, ...Param[]]
type Rules = Rule | Rule[]
type Done = (resultSet: ResultSet, context: Context) => Response | undefined

type RuleSet = {
  body: Record<string, Rules>
  json: Record<string, Rules>
  header: Record<string, Rules>
  query: Record<string, Rules>
  done: Done
  removeAdditional: boolean
}

type ResultSet = {
  hasError: boolean
  messages: string[]
}

type Result = {
  rule: Function
  params: Param[]
  message?: string
}

export class ValidatorMessage {
  value: string
  constructor(value: string) {
    this.value = value
  }
  getMessage(): string {
    return this.value
  }
}

const message = (value: string): ValidatorMessage => {
  return new ValidatorMessage(value)
}

export const validatorMiddleware = <Validator>(validator: Validator) => {
  return (
    validatorFunction: (
      validator: Validator,
      message: (value: string) => ValidatorMessage
    ) => Partial<RuleSet>
  ): Handler => {
    return async (c, next) => {
      const validations = validatorFunction(validator, message)

      const result: ResultSet = {
        hasError: false,
        messages: [],
      }

      const v = validations
      v.removeAdditional = v.removeAdditional === undefined ? true : v.removeAdditional // default value is `true`

      function validate(rules: Rules, value: string, messageFunc: (ruleName: string) => string) {
        value ||= ''

        let count = 0
        const results: Result[] = []

        const check = (rules: Rules) => {
          if (!Array.isArray(rules)) {
            if (rules instanceof ValidatorMessage) {
              if (results[count - 1]) {
                results[count - 1].message = rules.getMessage()
              }
            } else if (typeof rules === 'function') {
              results[count] = {
                rule: rules,
                params: [],
              }
              count++
            } else {
              results[count - 1].params.push(rules)
            }
          } else {
            if (typeof rules[0] === ('string' || 'number')) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              results[count - 1].params.push(rules)
            } else {
              for (const rule of rules) {
                check(rule as Rules)
              }
            }
          }
        }
        check(rules)

        let invalid = false
        results.map((r) => {
          const ok = r.rule(value, ...r.params)
          if (!invalid && ok === false) {
            invalid = true
            if (r.message) {
              result.messages.push(r.message)
            } else {
              result.messages.push(messageFunc(r.rule.name))
            }
          }
          if (typeof ok !== 'boolean') {
            // ok is sanitized string
            value = ok
          }
        })

        if (invalid) {
          result.hasError = true
          return
        }
      }

      if (v.query) {
        const query = v.query
        const realQueries = c.req.query()
        const validatedQueries: Record<string, string> = {}

        Object.keys(query).map((key) => {
          validatedQueries[key] = realQueries[key] || ''
          const message = (name: string) =>
            `Invalid Value: the query parameter "${key}" is invalid - ${name}`
          validate(query[key], validatedQueries[key], message)
        })
        if (!result.hasError && v.removeAdditional) {
          c.req.queryData = validatedQueries
        }
      }

      if (v.header) {
        const header = v.header
        const realHeaders: Record<string, string> = {}
        for (const key of c.req.headers.keys()) {
          realHeaders[key] = c.req.headers.get(key) || ''
        }
        const validatedHeaders: Record<string, string> = {}

        Object.keys(header).map((key) => {
          validatedHeaders[key] = realHeaders[key] || ''
          const message = (name: string) =>
            `Invalid Value: the request header "${key}" is invalid - ${name}`
          validate(header[key], validatedHeaders[key], message)
        })
        if (!result.hasError && v.removeAdditional) {
          c.req.headerData = validatedHeaders
        }
      }

      if (v.body) {
        const field = v.body
        const parsedBody = (await c.req.parseBody()) as Record<string, string>
        const kv = { ...parsedBody }
        const validatedKv: Record<string, string> = {}

        Object.keys(field).map(async (key) => {
          validatedKv[key] = kv[key] || ''
          const message = (name: string) =>
            `Invalid Value: the request body "${key}" is invalid - ${name}`
          validate(field[key], validatedKv[key], message)
        })
        if (!result.hasError && v.removeAdditional) {
          c.req.bodyData = validatedKv
        }
      }

      if (v.json) {
        const field = v.json
        const json = (await c.req.json()) as object
        const validatedJson: object = new (json as any).constructor()

        Object.keys(field).map(async (key) => {
          const value = JSONPathCopy(json, validatedJson, key)
          const message = (name: string) =>
            `Invalid Value: the JSON body "${key}" is invalid - ${name}`
          validate(field[key], value, message)
        })

        if (!result.hasError && v.removeAdditional) {
          c.req.jsonData = validatedJson
        }
      }

      if (v.done) {
        const res = v.done(result, c)
        if (res) {
          return res
        }
      }

      if (result.hasError) {
        return c.text(result.messages.join('\n'), 400)
      }
      await next()
    }
  }
}
