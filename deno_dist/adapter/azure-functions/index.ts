import type { Context } from './Context.d.ts'
export { Context } from './Context.d.ts'
export { HttpRequest } from './http.d.ts'
export { handle } from './handler.ts'
export type AzureFunction = (context: Context, ...args: any[]) => Promise<any> | void;
