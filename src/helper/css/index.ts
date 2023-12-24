type Styles = Record<string, string>
const styles: Styles = {}

/**
 * Used the goober'code as a reference:
 * https://github.com/cristianbote/goober/blob/master/src/core/to-hash.js
 * MIT License, Copyright (c) 2019 Cristian Bote
 */
const toHash = (str: string): string => {
  let i = 0,
    out = 11
  while (i < str.length) {
    out = (101 * out + str.charCodeAt(i++)) >>> 0
  }
  return 'css-' + out
}

export const css = (strings: TemplateStringsArray, ...values: string[]): string => {
  let styleString = ''
  strings.forEach((string, index) => {
    string = string.trim().replace(/\n\s*/g, ' ')
    styleString += string + (values[index] || '')
  })

  const className = toHash(styleString)
  if (!styles[className]) {
    styles[className] = styleString.trim()
  }
  return className
}

export const renderStyles = (): string => {
  const styleString = Object.entries(styles)
    .map(([className, style]) => {
      return `.${className} { ${style} }`
    })
    .join()
  return styleString
}
