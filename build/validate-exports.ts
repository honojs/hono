export const validateExports = (
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  fileName: string
) => {
  const isEntryInTarget = (entry: string): boolean => {
    if (entry in target) {
      return true
    }

    // e.g., "./utils/*" -> "./utils"
    const wildcardPrefix = entry.replace(/\/\*$/, '')
    if (entry.endsWith('/*')) {
      return Object.keys(target).some(
        (targetEntry) =>
          targetEntry.startsWith(wildcardPrefix + '/') && targetEntry !== wildcardPrefix
      )
    }

    const separatedEntry = entry.split('/')
    while (separatedEntry.length > 0) {
      const pattern = `${separatedEntry.join('/')}/*`
      if (pattern in target) {
        return true
      }
      separatedEntry.pop()
    }

    return false
  }

  Object.keys(source).forEach((sourceEntry) => {
    if (!isEntryInTarget(sourceEntry)) {
      throw new Error(`Missing "${sourceEntry}" in '${fileName}'`)
    }
  })
}
