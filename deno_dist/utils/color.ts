// export function getColorEnabled() {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const { process, Deno } = globalThis as any
//   const isNoColor =
//     typeof process !== 'undefined'
//       ? // eslint-disable-next-line no-unsafe-optional-chaining
//         'NO_COLOR' in process?.env
//       : typeof Deno?.noColor === 'boolean'
//       ? (Deno.noColor as boolean)
//       : false
//   return !isNoColor
// }

export function getColorEnabled(): boolean {
  const isNode = typeof process !== 'undefined' && process?.env?.NO_COLOR !== undefined
  const isDeno = typeof Deno !== 'undefined'

  return !(isNode || isDeno)
}