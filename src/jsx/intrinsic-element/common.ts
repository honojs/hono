export const deDupeKeyMap: Record<string, string[]> = {
  title: [],
  script: ['src'],
  style: ['data-href'],
  link: ['href', 'rel', 'hreflang'],
  meta: ['name', 'httpEquiv', 'charset', 'itemProp'],
}

export const domRenderers: Record<string, Function> = {}

export const dataPrecedenceAttr = 'data-precedence'
