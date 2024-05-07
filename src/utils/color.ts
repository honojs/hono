export function getColorEnabled() {
  const isNode = typeof process !== 'undefined' && process?.env?.NO_COLOR !== undefined
  const isDeno = typeof Deno !== 'undefined'

  return !(isNode || isDeno)
}