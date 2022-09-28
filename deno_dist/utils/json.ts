const ARRAY_NOTATION_REGEX = /\[([0-9\*])\]/
const ANY_INDEX = '*'

export type JSONPrimative = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimative | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimative | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimative

export type AnyIndex = typeof ANY_INDEX

export const isArraySubpath = (subpath: string): boolean => {
  const match = subpath.match(ARRAY_NOTATION_REGEX)
  return Boolean(match ? match.length : false)
}
export const getArrSubpathIndex = (subpath: string): number | AnyIndex | undefined => {
  const match = subpath.match(ARRAY_NOTATION_REGEX)
  if (!match?.length) return undefined
  // This works because only * and 0-9 should pass regex
  if (match[1] === '*') {
    return match[1]
  } else {
    const asInt = parseInt(match[1])
    if (isNaN(asInt)) return undefined
    else return asInt
  }
}

const fromPath = (data: JSONObject, parts: string[]): JSONValue | undefined => {
  let val: JSONValue | undefined = data
  const length = parts.length
  for (let i = 0; i < length && val !== undefined; i++) {
    const p = parts[i]
    if (p !== '') {
      if (isArraySubpath(p)) {
        const arrName = p.replace(ARRAY_NOTATION_REGEX, '')
        const arr = (val as JSONObject)[arrName] as JSONObject[] | JSONPrimative[]
        if (Array.isArray(arr)) {
          const subIdx = getArrSubpathIndex(p)
          if (typeof subIdx === 'number') {
            val = arr[subIdx]
          } else if (subIdx === '*') {
            // Get rest of path
            if (Array.isArray(arr[0])) {
              throw new Error('Directly nested arrays not supported!')
            }
            val = arr.flatMap((curr) =>
              curr && typeof curr === 'object' ? fromPath(curr, parts.slice(i + 1)) : curr
            )
            break
          } else {
            val = undefined
          }
        } else {
          // This is an error, return undefined
          val = undefined
        }
      } else if (Array.isArray(val)) {
        // Val is an array, but we weren't marked as an array subpath
        // Also, we know we shouldn't be here if this array was the last subpath part
        // So this is invalid
        val = undefined
      } else if (typeof val === 'object') {
        // Type coercion because type validator thinks val can be null past the if check
        val = (val as JSONObject)[p]
      } else {
        val = undefined
      }
    }
  }
  return val
}

export const JSONPath = (data: JSONObject, path: string) => {
  let val: JSONValue | undefined = data
  const parts = path.split('.')
  val = fromPath(data, parts)
  return val
}
