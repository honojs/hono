/* eslint-disable @typescript-eslint/no-explicit-any */
export const isObject = (val: any): boolean => val && typeof val === 'object' && !Array.isArray(val)

export const mergeObjects = (target: any, source: any) => {
  const merged = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      if (isObject(source[key])) {
        if (target[key] === undefined) Object.assign(merged, { [key]: source[key] })
        else merged[key] = mergeObjects(target[key], source[key])
      } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        const srcArr = source[key]
        const tgtArr = target[key]
        const outArr = [] as any[]
        for (let i = 0; i < srcArr.length; i += 1) {
          // If corresponding index for both arrays is an object, then merge them
          // Otherwise just copy src arr index into out arr index
          if (isObject(srcArr[i]) && isObject(tgtArr[i])) {
            outArr[i] = mergeObjects(tgtArr[i], srcArr[i])
          } else {
            outArr[i] = srcArr[i]
          }
        }
        Object.assign(merged, { [key]: outArr })
      } else {
        Object.assign(merged, { [key]: source[key] })
      }
    }
  }
  return merged
}
