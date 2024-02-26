import type { JSXNode } from '../base.ts'
import type { FC, Child, Props } from '../base.ts'
import { DOM_RENDERER, DOM_ERROR_HANDLER, DOM_STASH } from '../constants.ts'
import type { Context as JSXContext } from '../context.ts'
import { globalContexts as globalJSXContexts, useContext } from '../context.ts'
import type { EffectData } from '../hooks/index.ts'
import { STASH_EFFECT } from '../hooks/index.ts'
import { createContext } from './context.ts' // import dom-specific versions

const eventAliasMap: Record<string, string> = {
  Change: 'Input',
  DoubleClick: 'DblClick',
} as const

const nameSpaceMap: Record<string, string> = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML',
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HasRenderToDom = FC<any> & { [DOM_RENDERER]: FC<any> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorHandler = (error: any, retry: () => void) => Child | undefined

type Container = HTMLElement | DocumentFragment
type LocalJSXContexts = [JSXContext<unknown>, unknown][] | undefined
type SupportedElement = HTMLElement | SVGElement | MathMLElement

export type NodeObject = {
  pP: Props | undefined // previous props
  nN: Node | undefined // next node
  vC: Node[] // virtual dom children
  vR: Node[] // virtual dom children to remove
  s?: Node[] // shadow virtual dom children
  n?: string // namespace
  c: Container | undefined // container
  e: SupportedElement | Text | undefined // rendered element
  [DOM_STASH]:
    | [
        number, // current hook index
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[][], // stash for hooks
        LocalJSXContexts // context
      ]
    | [
        number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[][]
      ]
} & JSXNode
type NodeString = [
  string, // text content
  boolean // is dirty
] & {
  e?: Text
  // like a NodeObject
  vC: undefined
  nN: undefined
  // from JSXNode
  key: undefined
  tag: undefined
}
export type Node = NodeString | NodeObject

export type PendingType =
  | 0 // no pending
  | 1 // global
  | 2 // hook
export type UpdateHook = (
  context: Context,
  node: Node,
  cb: (context: Context) => void
) => Promise<void>
export type Context =
  | [
      PendingType, // PendingType
      boolean, // got an error
      UpdateHook, // update hook
      boolean // is in view transition
    ]
  | [PendingType, boolean, UpdateHook]
  | [PendingType, boolean]
  | [PendingType]
  | []

export const buildDataStack: [Context, Node][] = []

let nameSpaceContext: JSXContext<string> | undefined = undefined

const isNodeString = (node: Node): node is NodeString => Array.isArray(node)

const getEventSpec = (key: string): [string, boolean] | undefined => {
  const match = key.match(/^on([A-Z][a-zA-Z]+?)((?<!Pointer)Capture)?$/)
  if (match) {
    const [, eventName, capture] = match
    return [(eventAliasMap[eventName] || eventName).toLowerCase(), !!capture]
  }
  return undefined
}

const applyProps = (container: SupportedElement, attributes: Props, oldAttributes?: Props) => {
  attributes ||= {}
  for (const [key, value] of Object.entries(attributes)) {
    if (!oldAttributes || oldAttributes[key] !== value) {
      const eventSpec = getEventSpec(key)
      if (eventSpec) {
        if (typeof value !== 'function') {
          throw new Error(`Event handler for "${key}" is not a function`)
        }

        if (oldAttributes) {
          container.removeEventListener(eventSpec[0], oldAttributes[key], eventSpec[1])
        }
        container.addEventListener(eventSpec[0], value, eventSpec[1])
      } else if (key === 'dangerouslySetInnerHTML' && value) {
        container.innerHTML = value.__html
      } else if (key === 'ref') {
        if (typeof value === 'function') {
          value(container)
        } else if ('current' in value) {
          value.current = container
        }
      } else if (key === 'style') {
        if (typeof value === 'string') {
          container.style.cssText = value
        } else {
          container.style.cssText = ''
          Object.assign(container.style, value)
        }
      } else {
        const nodeName = container.nodeName
        if (key === 'value') {
          if (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || nodeName === 'SELECT') {
            ;(container as HTMLInputElement).value =
              value === null || value === undefined || value === false ? null : value

            if (nodeName === 'TEXTAREA') {
              container.textContent = value
              continue
            } else if (nodeName === 'SELECT') {
              if ((container as HTMLSelectElement).selectedIndex === -1) {
                ;(container as HTMLSelectElement).selectedIndex = 0
              }
              continue
            }
          }
        } else if (
          (key === 'checked' && nodeName === 'INPUT') ||
          (key === 'selected' && nodeName === 'OPTION')
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(container as any)[key] = value
        }

        if (value === null || value === undefined || value === false) {
          container.removeAttribute(key)
        } else if (value === true) {
          container.setAttribute(key, '')
        } else if (typeof value === 'string' || typeof value === 'number') {
          container.setAttribute(key, value as string)
        } else {
          container.setAttribute(key, value.toString())
        }
      }
    }
  }
  if (oldAttributes) {
    for (const [key, value] of Object.entries(oldAttributes)) {
      if (!(key in attributes)) {
        const eventSpec = getEventSpec(key)
        if (eventSpec) {
          container.removeEventListener(eventSpec[0], value, eventSpec[1])
        } else if (key === 'ref') {
          if (typeof value === 'function') {
            value(null)
          } else {
            value.current = null
          }
        } else {
          container.removeAttribute(key)
        }
      }
    }
  }
}

const invokeTag = (context: Context, node: NodeObject): Child[] => {
  if (node.s) {
    const res = node.s
    node.s = undefined
    return res as Child[]
  }

  node[DOM_STASH][0] = 0
  buildDataStack.push([context, node])
  const func = (node.tag as HasRenderToDom)[DOM_RENDERER] || node.tag
  try {
    return [
      func.call(null, {
        ...node.props,
        children: node.children,
      }),
    ]
  } finally {
    buildDataStack.pop()
  }
}

const getNextChildren = (
  node: NodeObject,
  container: Container,
  nextChildren: Node[],
  childrenToRemove: Node[],
  callbacks: EffectData[]
) => {
  childrenToRemove.push(...node.vR)
  if (typeof node.tag === 'function') {
    node[DOM_STASH][1][STASH_EFFECT]?.forEach((data: EffectData) => callbacks.push(data))
  }
  node.vC.forEach((child) => {
    if (isNodeString(child)) {
      nextChildren.push(child)
    } else {
      if (typeof child.tag === 'function' || child.tag === '') {
        child.c = container
        getNextChildren(child, container, nextChildren, childrenToRemove, callbacks)
      } else {
        nextChildren.push(child)
        childrenToRemove.push(...child.vR)
      }
    }
  })
}

const findInsertBefore = (node: Node | undefined): ChildNode | null => {
  if (!node) {
    return null
  } else if (node.e) {
    return node.e
  }

  if (node.vC) {
    for (let i = 0, len = node.vC.length; i < len; i++) {
      const e = findInsertBefore(node.vC[i])
      if (e) {
        return e
      }
    }
  }

  return findInsertBefore(node.nN)
}

const removeNode = (node: Node) => {
  if (!isNodeString(node)) {
    node[DOM_STASH]?.[1][STASH_EFFECT]?.forEach((data: EffectData) => data[2]?.())
    node.vC?.forEach(removeNode)
  }
  node.e?.remove()
  node.tag = undefined
}

const apply = (node: NodeObject, container: Container) => {
  if (node.tag === undefined) {
    return
  }

  node.c = container
  applyNodeObject(node, container)
}

const applyNode = (node: Node, container: Container) => {
  if (isNodeString(node)) {
    container.textContent = node[0]
  } else {
    applyNodeObject(node, container)
  }
}

const findChildNodeIndex = (
  childNodes: NodeListOf<ChildNode>,
  child: ChildNode | null | undefined
): number | undefined => {
  if (!child) {
    return
  }

  for (let i = 0, len = childNodes.length; i < len; i++) {
    if (childNodes[i] === child) {
      return i
    }
  }

  return
}

const applyNodeObject = (node: NodeObject, container: Container) => {
  const next: Node[] = []
  const remove: Node[] = []
  const callbacks: EffectData[] = []
  getNextChildren(node, container, next, remove, callbacks)

  const childNodes = container.childNodes
  let offset =
    findChildNodeIndex(childNodes, findInsertBefore(node.nN)) ??
    findChildNodeIndex(childNodes, next.find((n) => n.e)?.e) ??
    childNodes.length

  for (let i = 0, len = next.length; i < len; i++, offset++) {
    const child = next[i]

    let el: SupportedElement | Text
    if (isNodeString(child)) {
      if (child.e && child[1]) {
        child.e.textContent = child[0]
      }
      child[1] = false
      el = child.e ||= document.createTextNode(child[0])
    } else {
      el = child.e ||= child.n
        ? (document.createElementNS(child.n, child.tag as string) as SVGElement | MathMLElement)
        : document.createElement(child.tag as string)
      applyProps(el as HTMLElement, child.props, child.pP)
      applyNode(child, el as HTMLElement)
    }
    if (childNodes[offset] !== el && childNodes[offset - 1] !== child.e) {
      container.insertBefore(el, childNodes[offset] || null)
    }
  }
  remove.forEach(removeNode)
  callbacks.forEach(([, cb]) => cb?.())
  requestAnimationFrame(() => {
    callbacks.forEach(([, , , cb]) => cb?.())
  })
}

export const build = (
  context: Context,
  node: NodeObject,
  topLevelErrorHandlerNode: NodeObject | undefined,
  children?: Child[]
): void => {
  if (node.tag === undefined) {
    return
  }

  let errorHandler: ErrorHandler | undefined
  children ||= typeof node.tag == 'function' ? invokeTag(context, node) : node.children
  if ((children[0] as JSXNode)?.tag === '') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorHandler = (children[0] as any)[DOM_ERROR_HANDLER] as ErrorHandler
    topLevelErrorHandlerNode ||= node
  }
  const oldVChildren: Node[] = node.vC ? [...node.vC] : []
  const vChildren: Node[] = []
  const vChildrenToRemove: Node[] = []
  let prevNode: Node | undefined
  try {
    children.flat().forEach((c: Child) => {
      let child = buildNode(c)
      if (child) {
        if (prevNode) {
          prevNode.nN = child
        }
        prevNode = child

        if (typeof child.tag === 'function' && globalJSXContexts.length > 0) {
          child[DOM_STASH][2] = globalJSXContexts.map((c) => [c, c.values.at(-1)])
        }

        let oldChild: Node | undefined
        const i = oldVChildren.findIndex((c) => c.key === (child as Node).key)
        if (i !== -1) {
          oldChild = oldVChildren[i]
          oldVChildren.splice(i, 1)
        }

        if (oldChild) {
          if (isNodeString(child)) {
            if (!isNodeString(oldChild)) {
              vChildrenToRemove.push(oldChild)
            } else {
              if (oldChild[0] !== child[0]) {
                oldChild[0] = child[0] // update text content
                oldChild[1] = true
              }
              child = oldChild
            }
          } else if (oldChild.tag !== child.tag) {
            vChildrenToRemove.push(oldChild)
          } else {
            oldChild.pP = oldChild.props
            oldChild.props = child.props
            oldChild.children = child.children
            child = oldChild
          }
        } else if (!isNodeString(child) && nameSpaceContext) {
          const ns = useContext(nameSpaceContext)
          if (ns) {
            child.n = ns
          }
        }

        if (!isNodeString(child)) {
          build(context, child, topLevelErrorHandlerNode)
        }
        vChildren.push(child)
      }
    })
    node.vC = vChildren
    vChildrenToRemove.push(...oldVChildren)
    node.vR = vChildrenToRemove
  } catch (e) {
    if (errorHandler) {
      const fallback = errorHandler(e, () =>
        update([0, false, context[2] as UpdateHook], topLevelErrorHandlerNode as NodeObject)
      )
      if (fallback) {
        if (context[0] === 1) {
          context[1] = true
        } else {
          build(context, node, topLevelErrorHandlerNode, [fallback])
        }
        return
      }
    }
    throw e
  }
}

const buildNode = (node: Child): Node | undefined => {
  if (node === undefined || node === null || typeof node === 'boolean') {
    return undefined
  } else if (typeof node === 'string' || typeof node === 'number') {
    return [node.toString(), true] as NodeString
  } else {
    if (typeof (node as JSXNode).tag === 'function') {
      ;(node as NodeObject)[DOM_STASH] = [0, []]
    } else {
      const ns = nameSpaceMap[(node as JSXNode).tag as string]
      if (ns) {
        ;(node as NodeObject).n = ns
        nameSpaceContext ||= createContext('')
        ;(node as JSXNode).children = [
          {
            tag: nameSpaceContext.Provider,
            props: {
              value: ns,
            },
            children: (node as JSXNode).children,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any
      }
    }
    return node as NodeObject
  }
}

const replaceContainer = (node: NodeObject, from: DocumentFragment, to: Container) => {
  if (node.c === from) {
    node.c = to
    node.vC.forEach((child) => replaceContainer(child as NodeObject, from, to))
  }
}

const updateSync = (context: Context, node: NodeObject) => {
  node[DOM_STASH][2]?.forEach(([c, v]) => {
    c.values.push(v)
  })
  build(context, node, undefined)
  node[DOM_STASH][2]?.forEach(([c]) => {
    c.values.pop()
  })
  if (context[0] !== 1 || !context[1]) {
    apply(node, node.c as Container)
  }
}

type UpdateMapResolve = (node: NodeObject | undefined) => void
const updateMap = new WeakMap<NodeObject, [UpdateMapResolve, Function]>()
export const update = async (
  context: Context,
  node: NodeObject
): Promise<NodeObject | undefined> => {
  const existing = updateMap.get(node)
  if (existing) {
    // execute only the last update() call, so the previous update will be canceled.
    existing[0](undefined)
  }

  let resolve: UpdateMapResolve | undefined
  const promise = new Promise<NodeObject | undefined>((r) => (resolve = r))
  updateMap.set(node, [
    resolve as UpdateMapResolve,
    () => {
      if (context[2]) {
        context[2](context, node, (context) => {
          updateSync(context, node)
        }).then(() => (resolve as UpdateMapResolve)(node))
      } else {
        updateSync(context, node)
        ;(resolve as UpdateMapResolve)(node)
      }
    },
  ])

  await Promise.resolve()

  const latest = updateMap.get(node)
  if (latest) {
    updateMap.delete(node)
    latest[1]()
  }

  return promise
}

export const render = (jsxNode: unknown, container: Container) => {
  const node = buildNode({ tag: '', children: [jsxNode] } as JSXNode) as NodeObject
  build([], node, undefined)

  const fragment = document.createDocumentFragment()
  apply(node, fragment)
  replaceContainer(node, fragment, container)
  container.replaceChildren(fragment)
}
