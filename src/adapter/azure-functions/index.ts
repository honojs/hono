import type { Context } from './Context.d'
export { Context } from './Context.d'
export { HttpRequest } from './http.d'
export { handle } from './handler'
export type AzureFunction = (context: Context, ...args: any[]) => Promise<any> | void;
