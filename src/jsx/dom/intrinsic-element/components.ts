import type { Props } from '../../base'
import type { FC, JSXNode, PropsWithChildren, RefObject } from '../../types'
import { newJSXNode } from '../utils'
import { createPortal, getNameSpaceContext } from '../render'
import type { PreserveNodeType } from '../render'
import { useContext } from '../../context'
import { use, useCallback, useMemo, useState } from '../../hooks'
import { FormContext, registerAction } from '../hooks'
import { deDupeKeys, domRenderers } from '../../intrinsic-element/common'

const composeRef = <T>(
  ref: RefObject<T> | Function | undefined,
  cb: (e: T) => void | (() => void)
): ((e: T) => void | (() => void)) => {
  return useMemo(
    () => (e: T) => {
      let refCleanup: (() => void) | undefined
      if (ref) {
        if (typeof ref === 'function') {
          refCleanup =
            ref(e) ||
            (() => {
              ref(null)
            })
        } else if (ref && 'current' in ref) {
          ref.current = e
          refCleanup = () => {
            ref.current = null
          }
        }
      }

      const cbCleanup = cb(e)
      return () => {
        cbCleanup?.()
        refCleanup?.()
      }
    },
    [ref]
  )
}

const precedenceMap: WeakMap<HTMLElement, string> = new WeakMap()
const blockingPromiseMap: Record<string, Promise<Event> | undefined> = Object.create(null)
const createdElements: Record<string, HTMLElement> = Object.create(null)
const documentMetadataTag = (
  tag: string,
  props: Props,
  preserveNodeType: PreserveNodeType,
  deDupe: boolean,
  supportSort: boolean,
  supportBlocking: boolean
) => {
  if (props?.itemProp) {
    return newJSXNode({
      tag,
      props,
    })
  }

  let { onLoad, onError, precedence, blocking, ...restProps } = props
  let element: HTMLElement | null = null
  let created = false

  if (deDupe) {
    const tags = document.head.querySelectorAll<HTMLElement>(tag)
    if (deDupeKeys[tag].length === 0) {
      element = tags[0]
    } else {
      LOOP: for (const e of tags) {
        for (const key of deDupeKeys[tag]) {
          if (e.getAttribute(key) === props[key]) {
            element = e
            break LOOP
          }
        }
      }
    }

    if (!element) {
      const cacheKey = deDupeKeys[tag].reduce(
        (acc, key) => (props[key] === undefined ? acc : `${acc}-${key}-${props[key]}`),
        tag
      )
      created = !createdElements[cacheKey]
      element =
        createdElements[cacheKey] ||
        (() => {
          const e = document.createElement(tag)
          for (const key of deDupeKeys[tag]) {
            if (props[key] !== undefined) {
              e.setAttribute(key, props[key] as string)
            }
          }
          return e
        })()
      if (tag !== cacheKey) {
        // cache only when tag has some deDupeKeys
        createdElements[cacheKey] = element
      }
    }
  }

  if (props.disabled) {
    if (element) {
      ;(element as HTMLElement).remove()
    }
    return null
  }

  precedence = supportSort ? precedence ?? '' : undefined
  if (precedence && !precedenceMap.has(element as HTMLElement)) {
    precedenceMap.set(element as HTMLElement, precedence)
  }

  const insert = useCallback(
    (e: HTMLElement) => {
      let found = false
      for (const existingElement of document.head.querySelectorAll<HTMLElement>(tag)) {
        if (found) {
          document.head.insertBefore(e, existingElement)
          return
        }
        if (precedence && precedenceMap.get(existingElement) === precedence) {
          found = true
        }
      }

      // if sentinel is not found, append to the end
      document.head.appendChild(e)
    },
    [precedence]
  )

  const ref = composeRef(props.ref, (e: HTMLElement) => {
    const key = deDupeKeys[tag][0]

    if (preserveNodeType === 2) {
      e.innerHTML = ''
    }
    if (created) {
      insert(e)
    }

    let promise = (blockingPromiseMap[e.getAttribute(key) as string] ||= new Promise<Event>(
      (resolve, reject) => {
        e.addEventListener('load', (e) => {
          resolve(e)
        })
        e.addEventListener('error', (e) => {
          reject(e)
        })
      }
    ))
    if (onLoad) {
      promise = promise.then(onLoad)
    }
    if (onError) {
      promise = promise.catch(onError)
    }
    promise.catch(() => {})
  })

  if (supportBlocking && blocking === 'render') {
    const key = deDupeKeys[tag][0]
    if (props[key]) {
      const value = props[key]
      const promise = (blockingPromiseMap[value] ||= new Promise<Event>((resolve, reject) => {
        insert(element as HTMLElement)
        element!.addEventListener('load', resolve)
        element!.addEventListener('error', reject)
      }))
      use(promise)
    }
  }

  const jsxNode = newJSXNode({
    tag,
    props: {
      ...restProps,
      ref,
    },
  }) as JSXNode & { e?: HTMLElement; p?: PreserveNodeType }

  jsxNode.p = preserveNodeType // preserve for unmounting
  if (element) {
    jsxNode.e = element
  }

  return createPortal(
    jsxNode,
    document.head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}
export const title: FC<PropsWithChildren> = (props) => {
  const nameSpaceContext = getNameSpaceContext()
  const ns = nameSpaceContext && useContext(nameSpaceContext)
  if (ns?.endsWith('svg')) {
    return newJSXNode({
      tag: 'title',
      props,
    })
  }
  return documentMetadataTag('title', props, 2, true, false, false)
}

export const script: FC<
  PropsWithChildren<{
    async?: boolean
  }>
> = (props) => {
  return documentMetadataTag('script', props, 1, !!props.async, false, true)
}

export const style: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('style', props, 2, true, true, true)
}

export const link: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('link', props, 1, true, true, true)
}

export const meta: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('meta', props, 1, true, true, false)
}

export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
    ref?: RefObject<HTMLFormElement> | ((e: HTMLFormElement | null) => void | (() => void))
  }>
> = (props) => {
  const { action, ...restProps } = props
  if (typeof action !== 'function') {
    return newJSXNode({
      tag: 'form',
      props,
    })
  }

  const [data, setData] = useState<FormData | null>(null)
  const onSubmit = useCallback<(ev: SubmitEvent) => void>(async (ev: SubmitEvent) => {
    ev.preventDefault()
    const formData = new FormData(ev.target as HTMLFormElement)
    setData(formData)
    const actionRes = action(formData)
    if (actionRes instanceof Promise) {
      registerAction(actionRes)
      await actionRes
    }
    setData(null)
  }, [])

  const ref = composeRef(props.ref, (el: HTMLFormElement) => {
    el.addEventListener('submit', onSubmit)
    return () => {
      el.removeEventListener('submit', onSubmit)
    }
  })

  return newJSXNode({
    tag: FormContext as unknown as Function,
    props: {
      value: {
        pending: data !== null,
        data,
        method: data ? props.method || 'get' : null,
        action: data ? action : null,
      },
      children: newJSXNode({
        tag: 'form',
        props: {
          ...restProps,
          ref,
        },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

Object.assign(domRenderers, {
  title,
  script,
  style,
  link,
  meta,
  form,
})
