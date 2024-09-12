import type { Props } from '../../base'
import { useContext } from '../../context'
import { use, useCallback, useMemo, useState } from '../../hooks'
import { dataPrecedenceAttr, deDupeKeyMap, domRenderers } from '../../intrinsic-element/common'
import type { IntrinsicElements } from '../../intrinsic-elements'
import type { FC, JSXNode, PropsWithChildren, RefObject } from '../../types'
import { FormContext, registerAction } from '../hooks'
import type { PreserveNodeType } from '../render'
import { createPortal, getNameSpaceContext } from '../render'

// this function is a testing utility and should not be exported to the user
export const clearCache = () => {
  blockingPromiseMap = Object.create(null)
  createdElements = Object.create(null)
}

// this function is exported for testing and should not be used by the user
export const composeRef = <T>(
  ref: RefObject<T> | Function | undefined,
  cb: (e: T) => void | (() => void)
): ((e: T) => () => void) => {
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

let blockingPromiseMap: Record<string, Promise<Event> | undefined> = Object.create(null)
let createdElements: Record<string, HTMLElement> = Object.create(null)
const documentMetadataTag = (
  tag: string,
  props: Props,
  preserveNodeType: PreserveNodeType | undefined,
  supportSort: boolean,
  supportBlocking: boolean
) => {
  if (props?.itemProp) {
    return {
      tag,
      props,
      type: tag,
      ref: props.ref,
    }
  }

  const head = document.head

  let { onLoad, onError, precedence, blocking, ...restProps } = props
  let element: HTMLElement | null = null
  let created = false

  const deDupeKeys = deDupeKeyMap[tag]
  let existingElements: NodeListOf<HTMLElement> | undefined = undefined
  if (deDupeKeys.length > 0) {
    const tags = head.querySelectorAll<HTMLElement>(tag)
    LOOP: for (const e of tags) {
      for (const key of deDupeKeyMap[tag]) {
        if (e.getAttribute(key) === props[key]) {
          element = e
          break LOOP
        }
      }
    }

    if (!element) {
      const cacheKey = deDupeKeys.reduce(
        (acc, key) => (props[key] === undefined ? acc : `${acc}-${key}-${props[key]}`),
        tag
      )
      created = !createdElements[cacheKey]
      element = createdElements[cacheKey] ||= (() => {
        const e = document.createElement(tag)
        for (const key of deDupeKeys) {
          if (props[key] !== undefined) {
            e.setAttribute(key, props[key] as string)
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((props as any).rel) {
            e.setAttribute('rel', props.rel)
          }
        }
        return e
      })()
    }
  } else {
    existingElements = head.querySelectorAll<HTMLElement>(tag)
  }

  precedence = supportSort ? precedence ?? '' : undefined
  if (supportSort) {
    restProps[dataPrecedenceAttr] = precedence
  }

  const insert = useCallback(
    (e: HTMLElement) => {
      if (deDupeKeys.length > 0) {
        let found = false
        for (const existingElement of head.querySelectorAll<HTMLElement>(tag)) {
          if (found && existingElement.getAttribute(dataPrecedenceAttr) !== precedence) {
            head.insertBefore(e, existingElement)
            return
          }
          if (existingElement.getAttribute(dataPrecedenceAttr) === precedence) {
            found = true
          }
        }

        // if sentinel is not found, append to the end
        head.appendChild(e)
      } else if (existingElements) {
        let found = false
        for (const existingElement of existingElements!) {
          if (existingElement === e) {
            found = true
            break
          }
        }
        if (!found) {
          // newly created element
          head.insertBefore(
            e,
            head.contains(existingElements[0]) ? existingElements[0] : head.querySelector(tag)
          )
        }
        existingElements = undefined
      }
    },
    [precedence]
  )

  const ref = composeRef(props.ref, (e: HTMLElement) => {
    const key = deDupeKeys[0]

    if (preserveNodeType === 2) {
      e.innerHTML = ''
    }

    if (created || existingElements) {
      insert(e)
    }

    if (!onError && !onLoad) {
      return
    }

    let promise = (blockingPromiseMap[e.getAttribute(key) as string] ||= new Promise<Event>(
      (resolve, reject) => {
        e.addEventListener('load', resolve)
        e.addEventListener('error', reject)
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
    const key = deDupeKeyMap[tag][0]
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

  const jsxNode = {
    tag,
    type: tag,
    props: {
      ...restProps,
      ref,
    },
    ref,
  } as unknown as JSXNode & { e?: HTMLElement; p?: PreserveNodeType }

  jsxNode.p = preserveNodeType // preserve for unmounting
  if (element) {
    jsxNode.e = element
  }

  return createPortal(
    jsxNode,
    head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}
export const title: FC<PropsWithChildren> = (props) => {
  const nameSpaceContext = getNameSpaceContext()
  const ns = nameSpaceContext && useContext(nameSpaceContext)
  if (ns?.endsWith('svg')) {
    return {
      tag: 'title',
      props,
      type: 'title',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref: (props as any).ref,
    } as unknown as JSXNode
  }
  return documentMetadataTag('title', props, undefined, false, false)
}

export const script: FC<PropsWithChildren<IntrinsicElements['script']>> = (props) => {
  if (!props || ['src', 'async'].some((k) => !props[k])) {
    return {
      tag: 'script',
      props,
      type: 'script',
      ref: props.ref,
    } as unknown as JSXNode
  }
  return documentMetadataTag('script', props, 1, false, true)
}

export const style: FC<PropsWithChildren<IntrinsicElements['style']>> = (props) => {
  if (!props || !['href', 'precedence'].every((k) => k in props)) {
    return {
      tag: 'style',
      props,
      type: 'style',
      ref: props.ref,
    } as unknown as JSXNode
  }
  props['data-href'] = props.href
  delete props.href
  return documentMetadataTag('style', props, 2, true, true)
}

export const link: FC<PropsWithChildren<IntrinsicElements['link']>> = (props) => {
  if (
    !props ||
    ['onLoad', 'onError'].some((k) => k in props) ||
    (props.rel === 'stylesheet' && (!('precedence' in props) || 'disabled' in props))
  ) {
    return {
      tag: 'link',
      props,
      type: 'link',
      ref: props.ref,
    } as unknown as JSXNode
  }
  return documentMetadataTag('link', props, 1, 'precedence' in props, true)
}

export const meta: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('meta', props, undefined, false, false)
}

const customEventFormAction = Symbol()
export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
    ref?: RefObject<HTMLFormElement> | ((e: HTMLFormElement | null) => void | (() => void))
  }>
> = (props) => {
  const { action, ...restProps } = props
  if (typeof action !== 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(restProps as any).action = action
  }

  const [state, setState] = useState<[FormData | null, boolean]>([null, false]) // [FormData, isDirty]
  const onSubmit = useCallback<(ev: SubmitEvent | CustomEvent) => void>(
    async (ev: SubmitEvent | CustomEvent) => {
      const currentAction = ev.isTrusted
        ? action
        : (ev as CustomEvent).detail[customEventFormAction]
      if (typeof currentAction !== 'function') {
        return
      }

      ev.preventDefault()
      const formData = new FormData(ev.target as HTMLFormElement)
      setState([formData, true])
      const actionRes = currentAction(formData)
      if (actionRes instanceof Promise) {
        registerAction(actionRes)
        await actionRes
      }
      setState([null, true])
    },
    []
  )

  const ref = composeRef(props.ref, (el: HTMLFormElement) => {
    el.addEventListener('submit', onSubmit)
    return () => {
      el.removeEventListener('submit', onSubmit)
    }
  })

  const [data, isDirty] = state
  state[1] = false
  return {
    tag: FormContext as unknown as Function,
    props: {
      value: {
        pending: data !== null,
        data,
        method: data ? 'post' : null,
        action: data ? action : null,
      },
      children: {
        tag: 'form',
        props: {
          ...restProps,
          ref,
        },
        type: 'form',
        ref,
      },
    },
    f: isDirty,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const formActionableElement = (
  tag: string,
  {
    formAction,
    ...props
  }: {
    formAction?: Function | string
    ref?: RefObject<HTMLInputElement> | ((e: HTMLInputElement) => void | (() => void))
  }
) => {
  if (typeof formAction === 'function') {
    const onClick = useCallback<(ev: MouseEvent) => void>((ev: MouseEvent) => {
      ev.preventDefault()
      ;(ev.currentTarget! as HTMLInputElement).form!.dispatchEvent(
        new CustomEvent('submit', { detail: { [customEventFormAction]: formAction } })
      )
    }, [])

    props.ref = composeRef(props.ref, (el: HTMLInputElement) => {
      el.addEventListener('click', onClick)
      return () => {
        el.removeEventListener('click', onClick)
      }
    })
  }

  return {
    tag,
    props,
    type: tag,
    ref: props.ref,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

export const input: FC<PropsWithChildren<IntrinsicElements['input']>> = (props) =>
  formActionableElement('input', props)

export const button: FC<PropsWithChildren<IntrinsicElements['button']>> = (props) =>
  formActionableElement('button', props)

Object.assign(domRenderers, {
  title,
  script,
  style,
  link,
  meta,
  form,
  input,
  button,
})
