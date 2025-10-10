export const deDupeKeyMap: Record<string, string[]> = {
  title: [],
  script: ['src'],
  style: ['data-href'],
  link: ['href'],
  meta: ['name', 'httpEquiv', 'charset', 'itemProp'],
}

export const domRenderers: Record<string, Function> = {}

export const dataPrecedenceAttr = 'data-precedence'
