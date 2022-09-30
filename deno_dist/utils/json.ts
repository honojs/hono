export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive

const JSONPathInternal = (data: JSONValue, parts: string[]): JSONValue => {
  const length = parts.length
  for (let i = 0; i < length && data !== undefined; i++) {
    const p = parts[i]
    if (p === '') {
      continue
    }

    if (typeof data !== 'object' || data === null) {
      return undefined
    }

    if (p === '*') {
      const restParts = parts.slice(i + 1)
      const values = Object.values(data).map((v) => JSONPathInternal(v, restParts))
      return restParts.indexOf('*') === -1 ? values : values.flat()
    } else {
      data = (data as JSONObject)[p] // `data` may be an array, but accessing it as an object yields the same result.
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
