import type { GraphQLSchema } from 'graphql'

export interface GraphQLRequest {
  query: string
  variables?: { [key: string]: unknown }
  operationName?: string
}

export interface GraphQLConfig {
  schema: GraphQLSchema
  rootValue?: unknown
  contextValue?: unknown
  pretty?: boolean
}
