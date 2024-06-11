import type { Child, FC, JSXNode, Props } from '../base'
import { toArray } from '../children'
import { DOM_ERROR_HANDLER, DOM_INTERNAL_TAG, DOM_RENDERER, DOM_STASH } from '../constants'
import type { Context as JSXContext } from '../context'
import { globalContexts as globalJSXContexts, useContext } from '../context'
import type { EffectData } from '../hooks'
import { STASH_EFFECT } from '../hooks'
import { normalizeIntrinsicElementKey, styleObjectForEach } from '../utils'
import { createContext } from './context' // import dom-specific versions
import { newJSXNode } from './utils'

const HONO_PORTAL_ELEMENT = '_hp'

const eventAliasMap: Record<string, string> = {
  Change: 'Input',
  DoubleClick: 'DblClick',
} as const

const nameSpaceMap: Record<string, string> = {
  svg: '2000/svg',
  math: '1998/Math/MathML',
} as const

const skipProps: Set<string> = new Set(['children'])

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
type NodeString = {
  t: string // text content
  d: boolean // is dirty
} & {
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
      boolean, // is in view transition
      boolean // is in top level render
    ]
  | [PendingType, boolean, UpdateHook, boolean]
  | [PendingType, boolean, UpdateHook]
  | [PendingType, boolean]
  | [PendingType]
  | []

export const buildDataStack: [Context, Node][] = []

let nameSpaceContext: JSXContext<string> | undefined = undefined

const isNodeString = (node: Node): node is NodeString => 't' in (node as NodeString)

const getEventSpec = (key: string): [string, boolean] | undefined => {
  const match = key.match(/^on([A-Z][a-zA-Z]+?(?:PointerCapture)?)(Capture)?$/)
  if (match) {
    const [, eventName, capture] = match
    return [(eventAliasMap[eventName] || eventName).toLowerCase(), !!capture]
  }
  return undefined
}

const toAttributeName = (element: SupportedElement, key: string): string =>
  element instanceof SVGElement &&
  /[A-Z]/.test(key) &&
  (key in element.style || // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
    key.match(/^(?:o|pai|str|u|ve)/)) // Other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
    ? key.replace(/([A-Z])/g, '-$1').toLowerCase()
    : key

const applyProps = (
  container: SupportedElement,
  attributes: Props,
  oldAttributes?: Props
): void => {
  attributes ||= {}
  for (let [key, value] of Object.entries(attributes)) {
    if (!skipProps.has(key) && (!oldAttributes || oldAttributes[key] !== value)) {
      key = normalizeIntrinsicElementKey(key)
      const eventSpec = getEventSpec(key)
      if (eventSpec) {
        if (oldAttributes) {
          container.removeEventListener(eventSpec[0], oldAttributes[key], eventSpec[1])
        }
        if (value != null) {
          if (typeof value !== 'function') {
            throw new Error(`Event handler for "${key}" is not a function`)
          }
          container.addEventListener(eventSpec[0], value, eventSpec[1])
        }
      } else if (key === 'dangerouslySetInnerHTML' && value) {
        container.innerHTML = value.__html
      } else if (key === 'ref') {
        if (typeof value === 'function') {
          value(container)
        } else if (value && 'current' in value) {
          value.current = container
        }
      } else if (key === 'style') {
        const style = container.style
        if (typeof value === 'string') {
          style.cssText = value
        } else {
          style.cssText = ''
          if (value != null) {
            styleObjectForEach(value, style.setProperty.bind(style))
          }
        }
      } else {
        const nodeName = container.nodeName
        if (key === 'value') {
          if (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || nodeName === 'SELECT') {
            ;(container as unknown as HTMLInputElement).value =
              value === null || value === undefined || value === false ? null : value

            if (nodeName === 'TEXTAREA') {
              container.textContent = value
              continue
            } else if (nodeName === 'SELECT') {
              if ((container as unknown as HTMLSelectElement).selectedIndex === -1) {
                ;(container as unknown as HTMLSelectElement).selectedIndex = 0
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

        const k = toAttributeName(container, key)

        if (value === null || value === undefined || value === false) {
          container.removeAttribute(k)
        } else if (value === true) {
          container.setAttribute(k, '')
        } else if (typeof value === 'string' || typeof value === 'number') {
          container.setAttribute(k, value as string)
        } else {
          container.setAttribute(k, value.toString())
        }
      }
    }
  }
  if (oldAttributes) {
    for (let [key, value] of Object.entries(oldAttributes)) {
      if (!skipProps.has(key) && !(key in attributes)) {
        key = normalizeIntrinsicElementKey(key)
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
          container.removeAttribute(toAttributeName(container, key))
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((func as any).defaultProps || {}),
        ...node.props,
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
): void => {
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

const findInsertBefore = (node: Node | undefined): SupportedElement | Text | null => {
  if (!node) {
    return null
  } else if (node.tag === HONO_PORTAL_ELEMENT) {
    return findInsertBefore(node.nN)
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

const removeNode = (node: Node): void => {
  if (!isNodeString(node)) {
    node[DOM_STASH]?.[1][STASH_EFFECT]?.forEach((data: EffectData) => data[2]?.())

    if (node.e && node.props?.ref) {
      if (typeof node.props.ref === 'function') {
        node.props.ref(null)
      } else {
        node.props.ref.current = null
      }
    }
    node.vC?.forEach(removeNode)
  }
  if (node.tag !== HONO_PORTAL_ELEMENT) {
    node.e?.remove()
  }
  if (typeof node.tag === 'function') {
    updateMap.delete(node)
    fallbackUpdateFnArrayMap.delete(node)
  }
}

const apply = (node: NodeObject, container: Container): void => {
  node.c = container
  applyNodeObject(node, container)
}

const applyNode = (node: Node, container: Container): void => {
  if (isNodeString(node)) {
    container.textContent = node.t
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

const applyNodeObject = (node: NodeObject, container: Container): void => {
  const next: Node[] = []
  const remove: Node[] = []
  const callbacks: EffectData[] = []
  getNextChildren(node, container, next, remove, callbacks)

  const childNodes = container.childNodes
  let offset =
    findChildNodeIndex(childNodes, findInsertBefore(node.nN)) ??
    findChildNodeIndex(childNodes, next.find((n) => n.tag !== HONO_PORTAL_ELEMENT && n.e)?.e) ??
    childNodes.length

  for (let i = 0, len = next.length; i < len; i++, offset++) {
    const child = next[i]

    let el: SupportedElement | Text
    if (isNodeString(child)) {
      if (child.e && child.d) {
        child.e.textContent = child.t
      }
      child.d = false
      el = child.e ||= document.createTextNode(child.t)
    } else {
      el = child.e ||= child.n
        ? (document.createElementNS(child.n, child.tag as string) as SVGElement | MathMLElement)
        : document.createElement(child.tag as string)
      applyProps(el as HTMLElement, child.props, child.pP)
      applyNode(child, el as HTMLElement)
    }
    if (child.tag === HONO_PORTAL_ELEMENT) {
      offset--
    } else if (childNodes[offset] !== el && childNodes[offset - 1] !== child.e) {
      container.insertBefore(el, childNodes[offset] || null)
    }
  }
  remove.forEach(removeNode)
  callbacks.forEach(([, , , , cb]) => cb?.()) // invoke useInsertionEffect callbacks
  callbacks.forEach(([, cb]) => cb?.()) // invoke useLayoutEffect callbacks
  requestAnimationFrame(() => {
    callbacks.forEach(([, , , cb]) => cb?.()) // invoke useEffect callbacks
  })
}

const fallbackUpdateFnArrayMap: WeakMap<
  NodeObject,
  Array<() => Promise<NodeObject | undefined>>
> = new WeakMap<NodeObject, Array<() => Promise<NodeObject | undefined>>>()
export const build = (
  context: Context,
  node: NodeObject,
  topLevelErrorHandlerNode: NodeObject | undefined,
  children?: Child[]
): void => {
  let errorHandler: ErrorHandler | undefined
  children ||=
    typeof node.tag == 'function' ? invokeTag(context, node) : toArray(node.props.children)
  if ((children[0] as JSXNode)?.tag === '') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorHandler = (children[0] as any)[DOM_ERROR_HANDLER] as ErrorHandler
    topLevelErrorHandlerNode ||= node
  }
  const oldVChildren: Node[] = node.vC ? [...node.vC] : []
  const vChildren: Node[] = []
  node.vR = []
  let prevNode: Node | undefined
  try {
    children.flat().forEach((c: Child) => {
      let child = buildNode(c)
      if (child) {
        if (prevNode) {
          prevNode.nN = child
        }
        prevNode = child

        if (
          typeof child.tag === 'function' &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          !(child.tag as any)[DOM_INTERNAL_TAG] &&
          globalJSXContexts.length > 0
        ) {
          child[DOM_STASH][2] = globalJSXContexts.map((c) => [c, c.values.at(-1)])
        }

        let oldChild: Node | undefined
        const i = oldVChildren.findIndex(
          isNodeString(child)
            ? (c) => isNodeString(c)
            : child.key !== undefined
            ? (c) => c.key === (child as Node).key
            : (c) => c.tag === (child as Node).tag
        )
        if (i !== -1) {
          oldChild = oldVChildren[i]
          oldVChildren.splice(i, 1)
        }

        if (oldChild) {
          if (isNodeString(child)) {
            if ((oldChild as NodeString).t !== child.t) {
              ;(oldChild as NodeString).t = child.t // update text content
              ;(oldChild as NodeString).d = true
            }
            child = oldChild
          } else if (oldChild.tag !== child.tag) {
            node.vR.push(oldChild)
          } else {
            oldChild.pP = oldChild.props
            oldChild.props = child.props
            if (typeof child.tag === 'function') {
              oldChild[DOM_STASH][2] = child[DOM_STASH][2] || []
            }
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
    node.vR.push(...oldVChildren)
  } catch (e) {
    if (errorHandler) {
      const fallbackUpdateFn = () =>
        update([0, false, context[2] as UpdateHook], topLevelErrorHandlerNode as NodeObject)
      const fallbackUpdateFnArray =
        fallbackUpdateFnArrayMap.get(topLevelErrorHandlerNode as NodeObject) || []
      fallbackUpdateFnArray.push(fallbackUpdateFn)
      fallbackUpdateFnArrayMap.set(topLevelErrorHandlerNode as NodeObject, fallbackUpdateFnArray)
      const fallback = errorHandler(e, () => {
        const fnArray = fallbackUpdateFnArrayMap.get(topLevelErrorHandlerNode as NodeObject)
        if (fnArray) {
          const i = fnArray.indexOf(fallbackUpdateFn)
          if (i !== -1) {
            fnArray.splice(i, 1)
            return fallbackUpdateFn()
          }
        }
      })
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

export const buildNode = (node: Child): Node | undefined => {
  if (node === undefined || node === null || typeof node === 'boolean') {
    return undefined
  } else if (typeof node === 'string' || typeof node === 'number') {
    return { t: node.toString(), d: true } as NodeString
  } else {
    if ('vR' in node) {
      node = newJSXNode({
        tag: (node as NodeObject).tag,
        props: (node as NodeObject).props,
        key: (node as NodeObject).key,
      })
    }
    if (typeof (node as JSXNode).tag === 'function') {
      ;(node as NodeObject)[DOM_STASH] = [0, []]
    } else {
      const ns = nameSpaceMap[(node as JSXNode).tag as string]
      if (ns) {
        nameSpaceContext ||= createContext('')
        ;(node as JSXNode).props.children = [
          {
            tag: nameSpaceContext.Provider,
            props: {
              value: ((node as NodeObject).n = `http://www.w3.org/${ns}`),
              children: (node as JSXNode).props.children,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any
      }
    }
    return node as NodeObject
  }
}

const replaceContainer = (node: NodeObject, from: DocumentFragment, to: Container): void => {
  if (node.c === from) {
    node.c = to
    node.vC.forEach((child) => replaceContainer(child as NodeObject, from, to))
  }
}

const updateSync = (context: Context, node: NodeObject): void => {
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
const updateMap: WeakMap<NodeObject, [UpdateMapResolve, Function]> = new WeakMap<
  NodeObject,
  [UpdateMapResolve, Function]
>()
const currentUpdateSets: Set<NodeObject>[] = []
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

  if (currentUpdateSets.length) {
    ;(currentUpdateSets.at(-1) as Set<NodeObject>).add(node)
  } else {
    await Promise.resolve()

    const latest = updateMap.get(node)
    if (latest) {
      updateMap.delete(node)
      latest[1]()
    }
  }

  return promise
}

export const renderNode = (node: NodeObject, container: Container): void => {
  const context: Context = []
  ;(context as Context)[4] = true // start top level render
  build(context, node, undefined)
  ;(context as Context)[4] = false // finish top level render

  const fragment = document.createDocumentFragment()
  apply(node, fragment)
  replaceContainer(node, fragment, container)
  container.replaceChildren(fragment)
}

export const render = (jsxNode: Child, container: Container): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderNode(buildNode({ tag: '', props: { children: jsxNode } } as any) as NodeObject, container)
}

export const flushSync = (callback: () => void): void => {
  const set = new Set<NodeObject>()
  currentUpdateSets.push(set)
  callback()
  set.forEach((node) => {
    const latest = updateMap.get(node)
    if (latest) {
      updateMap.delete(node)
      latest[1]()
    }
  })
  currentUpdateSets.pop()
}

export const createPortal = (children: Child, container: HTMLElement, key?: string): Child =>
  ({
    tag: HONO_PORTAL_ELEMENT,
    props: {
      children,
    },
    key,
    e: container,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
