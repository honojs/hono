export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive

const JSONPathCopyInternal = (
  src: JSONObject,
  dst: JSONObject,
  parts: string[],
  results: JSONArray
): JSONValue => {
  let srcVal: JSONObject = src
  let dstVal: JSONObject = dst
  const length = parts.length
  for (let i = 0; i < length && srcVal !== undefined && dstVal; i++) {
    const p = parts[i]

    if (typeof srcVal !== 'object') {
      return srcVal
    }

    if (srcVal === null) {
      return undefined
    }

    if (p === '*') {
      const restParts = parts.slice(i + 1)
      const restLength = srcVal.length as number

      if (restLength === undefined) {
        parts = Object.keys(srcVal)
        for (const p of parts) {
          const srcVal2 = srcVal
          const dst2: JSONObject = {}
          JSONPathCopyInternal(srcVal2, dst2, [p], results)
          dstVal[p] = dst2[p]
        }
      } else {
        const res = []
        for (let i2 = 0; i2 < restLength; i2++) {
          if (typeof srcVal[i2] !== 'object' || srcVal[i2] === undefined) {
            res.push(srcVal[i2])
          } else {
            const srcVal2 = srcVal[i2] as JSONObject
            const dst2: JSONObject = {}
            const res2 = JSONPathCopyInternal(srcVal2, dst2, restParts, results)
            if (res2 === undefined) results.push(undefined)
            dstVal[i2] = dst2
          }
        }
        if (res.length) {
          Object.assign(dstVal, srcVal)
          results.push(...res)
        }
      }
      return results
    }

    if (typeof srcVal[p] === 'object') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      dstVal[p] ||= new srcVal[p].constructor()
    } else if (typeof srcVal[p] !== 'undefined') {
      dstVal[p] = srcVal[p]
    } else {
      return undefined
    }

    srcVal = srcVal[p] as JSONObject
    dstVal = dstVal[p] as JSONObject
  }

  if (typeof srcVal === 'object' && dstVal) {
    Object.assign(dstVal, srcVal)
  }

  results.push(srcVal)
  return results
}

export const JSONPathCopy = (src: JSONObject, dst: JSONObject, path: string) => {
  const results: JSONArray = []
  const parts = path.replace(/\.?\[(.*?)\]/g, '.$1').split(/\./)
  try {
    JSONPathCopyInternal(src, dst, parts, results)
    if (results.length === 0) {
      return undefined
    } else if (results.length === 1 && !parts.includes('*')) {
      return results[0]
    }
    return results
  } catch (e) {
    return undefined
  }
}
