import type { Child } from './base'

export const toArray = (children: Child): Child[] =>
  Array.isArray(children) ? children : [children]
export const Children = {
  map: (children: Child[], fn: (child: Child, index: number) => Child): Child[] =>
    toArray(children).map(fn),
  forEach: (children: Child[], fn: (child: Child, index: number) => void): void => {
    toArray(children).forEach(fn)
  },
  count: (children: Child[]): number => toArray(children).length,
  only: (_children: Child[]): Child => {
    const children = toArray(_children)
    if (children.length !== 1) {
      throw new Error('Children.only() expects only one child')
    }
    return children[0]
  },
  toArray,
}
