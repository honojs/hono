export let isOldBunVersion = (): boolean => {
  // @ts-expect-error @types/bun is not installed
  const version: string = typeof Bun !== 'undefined' ? Bun.version : undefined
  if (version === undefined) {
    return false
  }
  const result = version.startsWith('1.1') || version.startsWith('1.0') || version.startsWith('0.')
  // Avoid running this check on every call
  isOldBunVersion = () => result
  return result
}
