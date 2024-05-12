export function getColorEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  const isNoColor =
    typeof process !== 'undefined'
      ? // eslint-disable-next-line no-unsafe-optional-chaining
        'NO_COLOR' in process?.env
      : typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : false

  return !isNoColor
}
