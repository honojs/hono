export type JSONPrimative = string | boolean | number | null
export type JSONObject = { [key: string]: JSONPrimative }
export type JSONValue = JSONObject | JSONPrimative

export const JSONPath = (data: JSONObject, path: string) => {
  let val: JSONValue | undefined = data
  const parts = path.split('.')
  const length = parts.length
  for (let i = 0; i < length && val !== undefined && val !== null; i++) {
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
