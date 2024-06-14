export const deDupeKeys: Record<string, string[]> = {
  title: [],
  script: ['src'],
  style: ['href'],
  link: ['href'],
  meta: ['name', 'httpEquiv', 'charset', 'itemProp'],
}

export const domRenderers: Record<string, Function> = {}
