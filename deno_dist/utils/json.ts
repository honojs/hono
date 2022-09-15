export const JSONPathCopy = (src: object, dst: object, path: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let srcVal: any = src
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dstVal: any = dst
  const parts = path.split('.')
  const length = parts.length
  for (let i = 0; i < length && srcVal !== undefined; i++) {
    const p = parts[i]
    if (p !== '') {
      if (typeof srcVal === 'object') {
        if (typeof srcVal[p] === 'object') {
          dstVal[p] ||= new srcVal[p].constructor()
        } else if (p in srcVal) {
          dstVal[p] = srcVal[p]
        } else {
          return undefined
        }
        srcVal = srcVal[p]
        dstVal = dstVal[p]
      } else {
        return undefined
      }
    }
  }

  if (typeof srcVal === 'object') {
    Object.assign(dstVal, srcVal)
  }
  return srcVal
}
