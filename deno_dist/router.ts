export const METHOD_NAME_ALL = 'ALL' as const
export const METHOD_NAME_ALL_LOWERCASE = 'all' as const
export const METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'] as const
export const MESSAGE_MATCHER_IS_ALREADY_BUILT =
  'Can not add a route since the matcher is already built.'

export interface Router<T> {
  name: string
  add(method: string, path: string, handler: T): void
  match(method: string, path: string): Result<T>
}

export type ParamIndexMap = Record<string, number>
export type ParamStash = string[]
export type Params = Record<string, string>
export type Result<T> = [[T, ParamIndexMap][], ParamStash] | [[T, Params][]]
/*
The router returns the result of `match` in either format.

[[handler, paramIndexMap][], paramArray]
e.g.
[
  [
    [middlewareA, {}],                     // '*'
    [funcA,       {'id': 0}],              // '/user/:id/*'
    [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
  ],
  ['123', 'abc']
]

[[handler, params][]]
e.g.
[
  [
    [middlewareA, {}],                             // '*'
    [funcA,       {'id': '123'}],                  // '/user/:id/*'
    [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
  ]
]
*/

export class UnsupportedPathError extends Error {}
