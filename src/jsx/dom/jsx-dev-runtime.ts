import type { Props } from '..'

export const jsxDEV = (tag: string | Function, props: Props, key: string | undefined) => {
  const children = 'children' in props ? props.children : []
  delete props['children']
  return {
    tag,
    props,
    key,
    children: Array.isArray(children) ? children : [children],
  }
}

export const Fragment = (props: Record<string, unknown>) => jsxDEV('', props, undefined)
