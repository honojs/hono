/* eslint-disable @typescript-eslint/no-explicit-any */
export const mergeObjects = (target: any, source: any) => {
  if (Array.isArray(source)) {
    for (let i = 0, len = source.length; i < len; i++) {
      if (!target) target = []
      Object.assign(source[i], mergeObjects(target[i], source[i]))
    }
  } else {
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object) {
        if (!target) target = {}
        Object.assign(source[key], mergeObjects(target[key], source[key]))
      }
    }
  }
  Object.assign(target || {}, source)
  return target
}
