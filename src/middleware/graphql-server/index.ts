// Based on the code in the `express-graphql` package.
// https://github.com/graphql/express-graphql/blob/main/src/index.ts

import {
  Source,
  parse,
  execute,
  validateSchema,
  validate,
  specifiedRules,
  getOperationAST,
  GraphQLError,
} from 'graphql'

import type {
  GraphQLSchema,
  DocumentNode,
  ValidationRule,
  FormattedExecutionResult,
  GraphQLFormattedError,
} from 'graphql'

import type { Context } from '@/context'
import type { Next } from '@/hono'
import { parseBody } from '@/middleware/graphql-server/parse-body'

type Options = {
  schema: GraphQLSchema
  rootValue?: unknown
  pretty?: boolean
  validationRules?: ReadonlyArray<ValidationRule>
  // graphiql?: boolean
}

export const graphqlServer = (options: Options) => {
  const schema = options.schema
  const rootValue = options.rootValue
  const pretty = options.pretty ?? false
  const validationRules = options.validationRules ?? []
  // const showGraphiQL = options.graphiql ?? false

  return async (c: Context, next: Next) => {
    await next()

    // GraphQL HTTP only supports GET and POST methods.
    if (c.req.method !== 'GET' && c.req.method !== 'POST') {
      c.res = c.json(errorMessages(['GraphQL only supports GET and POST requests.']), 405, {
        Allow: 'GET, POST',
      })
      return
    }

    let params: GraphQLParams
    try {
      params = await getGraphQLParams(c.req)
    } catch (e) {
      if (e instanceof Error) {
        console.error(`${e.stack || e.message}`)
        c.res = c.json(errorMessages([e.message], [e]), 400)
      }
      return
    }

    const { query, variables, operationName } = params

    if (query == null) {
      c.res = c.json(errorMessages(['Must provide query string.']), 400)
      return
    }

    const schemaValidationErrors = validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
      // Return 500: Internal Server Error if invalid schema.
      c.res = c.json(
        errorMessages(['GraphQL schema validation error.'], schemaValidationErrors),
        500
      )
      return
    }

    let documentAST: DocumentNode
    try {
      documentAST = parse(new Source(query, 'GraphQL request'))
    } catch (syntaxError: unknown) {
      // Return 400: Bad Request if any syntax errors errors exist.
      if (syntaxError instanceof Error) {
        console.error(`${syntaxError.stack || syntaxError.message}`)
        const e = new GraphQLError(syntaxError.message, {
          originalError: syntaxError,
        })
        c.res = c.json(errorMessages(['GraphQL syntax error.'], [e]), 400)
      }
      return
    }

    // Validate AST, reporting any errors.
    const validationErrors = validate(schema, documentAST, [...specifiedRules, ...validationRules])

    if (validationErrors.length > 0) {
      // Return 400: Bad Request if any validation errors exist.
      c.res = c.json(errorMessages(['GraphQL validation error.'], validationErrors), 400)
      return
    }

    if (c.req.method === 'GET') {
      // Determine if this GET request will perform a non-query.
      const operationAST = getOperationAST(documentAST, operationName)
      if (operationAST && operationAST.operation !== 'query') {
        /*
        Now , does not support GraphiQL
        if (showGraphiQL) {
          //return respondWithGraphiQL(response, graphiqlOptions, params)
        }
        */

        // Otherwise, report a 405: Method Not Allowed error.
        c.res = c.json(
          errorMessages([
            `Can only perform a ${operationAST.operation} operation from a POST request.`,
          ]),
          405,
          { Allow: 'POST' }
        )
        return
      }
    }

    let result: FormattedExecutionResult

    try {
      result = await execute({
        schema,
        document: documentAST,
        rootValue,
        variableValues: variables,
        operationName: operationName,
      })
    } catch (contextError: unknown) {
      if (contextError instanceof Error) {
        console.error(`${contextError.stack || contextError.message}`)
        const e = new GraphQLError(contextError.message, {
          originalError: contextError,
          nodes: documentAST,
        })
        // Return 400: Bad Request if any execution context errors exist.
        c.res = c.json(errorMessages(['GraphQL execution context error.'], [e]), 400)
      }
      return
    }

    if (result.data == null) {
      c.res = c.json(errorMessages([result.errors.toString()], result.errors), 500)
      return
    }

    /*
    Now, does not support GraphiQL
    if (showGraphiQL) {
    }
    */

    if (pretty) {
      const payload = JSON.stringify(result, null, pretty ? 2 : 0)
      c.res = c.text(payload, 200, {
        'Content-Type': 'application/json',
      })
    } else {
      c.res = c.json(result)
    }
    return
  }
}

export interface GraphQLParams {
  query: string | null
  variables: { readonly [name: string]: unknown } | null
  operationName: string | null
  raw: boolean
}

export const getGraphQLParams = async (request: Request): Promise<GraphQLParams> => {
  const urlData = new URLSearchParams(request.url.split('?')[1])
  const bodyData = await parseBody(request)

  // GraphQL Query string.
  let query = urlData.get('query') ?? (bodyData.query as string | null)

  if (typeof query !== 'string') {
    query = null
  }

  // Parse the variables if needed.
  let variables = (urlData.get('variables') ?? bodyData.variables) as {
    readonly [name: string]: unknown
  } | null
  if (typeof variables === 'string') {
    try {
      variables = JSON.parse(variables)
    } catch {
      throw Error('Variables are invalid JSON.')
    }
  } else if (typeof variables !== 'object') {
    variables = null
  }

  // Name of GraphQL operation to execute.
  let operationName = urlData.get('operationName') ?? (bodyData.operationName as string | null)
  if (typeof operationName !== 'string') {
    operationName = null
  }

  const raw = urlData.get('raw') != null || bodyData.raw !== undefined

  const params: GraphQLParams = {
    query: query,
    variables: variables,
    operationName: operationName,
    raw: raw,
  }

  return params
}

export const errorMessages = (
  messages: string[],
  graphqlErrors?: readonly GraphQLError[] | readonly GraphQLFormattedError[]
) => {
  if (graphqlErrors) {
    return {
      errors: graphqlErrors,
    }
  }

  return {
    errors: messages.map((message) => {
      return {
        message: message,
      }
    }),
  }
}

// export const graphiQLResponse = () => {}
