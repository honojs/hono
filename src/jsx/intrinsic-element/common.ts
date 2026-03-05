import type { Props } from '../base'

export const deDupeKeyMap: Record<string, string[]> = {
  title: [],
  script: ['src'],
  style: ['data-href'],
  link: ['href'],
  meta: ['name', 'httpEquiv', 'charset', 'itemProp'],
}

export const domRenderers: Record<string, Function> = {}

export const dataPrecedenceAttr = 'data-precedence'

export const isStylesheetLinkWithPrecedence = (props: Props): boolean =>
  props.rel === 'stylesheet' && 'precedence' in props

export const shouldDeDupeByKey = (tagName: string, props: Props, supportSort: boolean): boolean => {
  if (tagName === 'link') {
    return supportSort
  }
  return deDupeKeyMap[tagName].length > 0
}
