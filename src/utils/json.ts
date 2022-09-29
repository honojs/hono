export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive

const noMatch = Symbol('no match')

const JSONPathInternal = (data: JSONValue, parts: string[]): JSONValue => {
  const length = parts.length
  for (let i = 0; i < length && data !== undefined; i++) {
    const p = parts[i]
    if (p === '') {
      continue
    }

    if (typeof data !== 'object' || data === null) {
      throw noMatch
    }

    if (p === '*') {
      const restParts = parts.slice(i + 1)
      const values = Object.values<JSONValue>(data).map((v): JSONValue | typeof noMatch => {
        try {
          return JSONPathInternal(v, restParts)
        } catch (e) {
          if (e === noMatch) {
            return noMatch
          } else {
            throw e
          }
        }
      })
      if (values.every((v) => v === noMatch)) {
        throw noMatch
      }
      const matches = values.filter((v): v is JSONValue => v !== noMatch)
      return restParts.indexOf('*') === -1 ? matches : matches.flat()
    } else if (p in data) {
      data = (data as JSONObject)[p] // `data` may be an array, but accessing it as an object yields the same result.
    } else {
      throw noMatch
    }
  }
  return data
}

export const JSONPath = (data: JSONObject, path: string) => {
  try {
    return JSONPathInternal(data, path.replace(/\[(.*?)\]/g, '.$1').split(/\./))
  } catch (e) {
    return undefined
  }
}
