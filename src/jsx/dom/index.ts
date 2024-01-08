import { JSXNode } from '..'
import type { Props, Child } from '..'

export interface VirtualNode {
  tag: string
  props: Props
  children: Child[]
  jsxNode?: JSXNode
}

export const updateStack: Function[] = []

const JSX_NODE = Symbol('jsxNode')

const mount = (node: JSXNode, container: HTMLElement) => {
  const { tag, props, children } = node

  if (typeof tag === 'function') {
    const update = () => {
      const res = (tag as Function).call(null, {
        ...props,
        children: children.length <= 1 ? children[0] : children,
      })
      if (res instanceof JSXNode) {
        const nodes = (container as any)[JSX_NODE]
        const n = nodes?.find((n:any) => n.node === node)
        if (n) {
          patch(n.res, res, container.childNodes[0] as HTMLElement)
          n.res = res
        }
        else {
          ;(container as any)[JSX_NODE] ||= []
          ;(container as any)[JSX_NODE].push({node, res})
        
          mount(res, container)
        }
        return
      } else if (typeof res === 'string') {
        const el = document.createTextNode(res)
        container.appendChild(el)
        return
      }
    }
    updateStack.push(update)
    update()
    updateStack.pop()
    return
  }

  const el = document.createElement(tag as string)
  for (const [key, value] of Object.entries(node.props)) {
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value as EventListener)
    } else {
      el.setAttribute(key, value as string)
    }
  }
  for (const child of node.children) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child.toString()))
    } else {
      mount(child as JSXNode, el)
    }
  }
  container.appendChild(el)
}

const patch = (oldNode: JSXNode, newNode: JSXNode, container: HTMLElement) => {
  if (oldNode.tag !== newNode.tag) {
    mount(newNode, container)
    return
  }

  for (const [key, value] of Object.entries(newNode.props)) {
    if (oldNode.props[key] !== value) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        container.removeEventListener(eventName, oldNode.props[key] as EventListener)
        container.addEventListener(eventName, value as EventListener)
      } else {
        container.setAttribute(key, value as string)
      }
    }
  }
  for (const [key, value] of Object.entries(oldNode.props)) {
    if (!(key in newNode.props)) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        container.removeEventListener(eventName, value as EventListener)
      } else {
        container.removeAttribute(key)
      }
    }
  }

  const oldChildren = oldNode.children
  const newChildren = newNode.children
  const length = Math.max(oldChildren.length, newChildren.length)
  for (let i = 0; i < length; i++) {
    if (newChildren[i] === undefined) {
      container.removeChild(container.childNodes[i])
    } else if (oldChildren[i] === undefined) {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.appendChild(document.createTextNode((newChildren[i] as string).toString()))
      } else {
        mount(newChildren[i] as JSXNode, container)
      }
    } else {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.replaceChild(
          document.createTextNode((newChildren[i] as string).toString()),
          container.childNodes[i]
        )
      } else {
        patch(oldChildren[i] as JSXNode, newChildren[i] as JSXNode, container.childNodes[i] as HTMLElement)
      }
    }
  }
}

export const render = (root: JSXNode, container: HTMLElement) => {
  mount(root, container)
}
