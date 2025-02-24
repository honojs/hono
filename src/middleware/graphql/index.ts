/**
 * @module
 * GraphQL Middleware for Hono.
 */
import type { GraphQLSchema } from 'graphql'
import { parse, validate, execute } from 'graphql'
import type { Context } from '../../context'
import type { Handler } from '../../types'

export interface GraphQLHandlerOptions {
  schema: GraphQLSchema
  rootValue?: unknown
  contextValue?: unknown
  pretty?: boolean
}

export const graphql = (options: GraphQLHandlerOptions): Handler => {
  return async (c: Context) => {
    // Only handle POST requests
    if (c.req.method !== 'POST') {
      return c.text('Method Not Allowed', 405)
    }

    try {
      const body = await c.req.json()
      const { query, variables, operationName } = body

      if (!query) {
        return c.json({ errors: [{ message: 'Must provide query string.' }] }, 400)
      }

      // Parse the query string
      const document = parse(query)

      // Validate the query against schema
      const validationErrors = validate(options.schema, document)
      if (validationErrors.length > 0) {
        return c.json({ errors: validationErrors }, 400)
      }

      // Execute query
      const result = await execute({
        schema: options.schema,
        document,
        rootValue: options.rootValue,
        contextValue: {
          ...(options.contextValue && typeof options.contextValue === 'object'
            ? options.contextValue
            : {}),
          // Allow passing context from Hono
          c,
        },
        variableValues: variables,
        operationName,
      })

      // Format response
      const response = options.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result)

      return new Response(response, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      return c.json(
        {
          errors: [
            {
              message: error instanceof Error ? error.message : 'Internal server error',
            },
          ],
        },
        500
      )
    }
  }
}
