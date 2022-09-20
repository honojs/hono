export const JSONPath = (data: object, path: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = data
  const parts = path.split('.')
  const length = parts.length
  for (let i = 0; i < length && val !== undefined; i++) {
    const p = parts[i]
    if (p !== '') {
      if (typeof val === 'object') {
        val = val[p]
      } else {
        val = undefined
      }
    }
  }
  return val
}
