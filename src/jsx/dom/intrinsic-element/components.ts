import type { Props } from '../../base'
import type { FC, JSXNode, PropsWithChildren, RefObject } from '../../types'
import { newJSXNode } from '../utils'
import { createPortal, getNameSpaceContext } from '../render'
import { useContext } from '../../context'
import { use, useCallback, useMemo, useState } from '../../hooks'
import { FormContext } from '../hooks'
import { deDupeKeys } from '../../intrinsic-element/common'
import { on } from 'events'

const composeRef = <T>(ref: RefObject<T> | Function | undefined, cb: (e: T) => void | (() => void)) => {
  useMemo(
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
        }
      }

      const cbCleanup = cb(e)
      return () => {
        cbCleanup?.()
        refCleanup!()
      }
    },
    [ref]
  )
}

const precedenceMap: WeakMap<HTMLElement, string> = new WeakMap()
const blockingPromiseMap: Record<string, Promise<Event> | undefined> = Object.create(null)
const documentMetadataTag = (
  tag: string,
  props: Props,
  deDupe: boolean,
  sort: boolean,
  blocking: boolean
) => {
  const jsxNode = newJSXNode({
    tag,
    props,
  }) as JSXNode & { e?: Element; nN: { e?: Element } }

  if (props?.itemProp) {
    return jsxNode
  }

  let { onLoad, onError, precedence, ...restProps } = props

  if (deDupe) {
    document.head.querySelectorAll(tag).forEach((e) => {
      if (deDupeKeys[tag].length === 0) {
        jsxNode.e = e
      } else {
        for (const key of deDupeKeys[tag]) {
          if ((e.getAttribute(key) ?? undefined) === props[key]) {
            jsxNode.e = e
            break
          }
        }
      }
    })
  }

  if (props.disabled) {
    if (jsxNode.e) {
      jsxNode.e.remove()
    }
    return null
  }

  let nextNode = null
  precedence = sort ? precedence ?? '' : undefined
  if (precedence && !jsxNode.e) {
    let found = false
    for (const e of [...document.head.querySelectorAll<HTMLElement>(tag)]) {
      if (found) {
        nextNode = e
        break
      }
      if (precedenceMap.get(e) === precedence) {
        found = true
      }
    }
    if (nextNode) {
      jsxNode.nN = {
        e: nextNode,
      }
    }
  }

  const ref = composeRef(props.ref, (e: HTMLElement) => {
    const key = deDupeKeys[tag][0]
    if (precedence) {
      precedenceMap.set(e, precedence)
    }
    const promise = (blockingPromiseMap[e.getAttribute(key) as string] ||= new Promise<Event>((resolve, reject) => {
      e.addEventListener('load', (e) => {
        resolve(e)
      })
      e.addEventListener('error', (e) => {
        reject(e)
      })
    }))
    if (onLoad) {
      promise.then(onLoad)
    }
    if (onError) {
      promise.catch(onError)
    }
  })

  if (blocking && props?.blocking === 'render') {
    const key = deDupeKeys[tag][0]
    if (props[key]) {
      const value = props[key]
      const promise = (blockingPromiseMap[value] ||= new Promise<Event>((resolve, reject) => {
        const e = document.createElement(tag)
        e.setAttribute(key, value)
        document.head.insertBefore(e, nextNode)
        e.addEventListener('load', (e) => {
          resolve(e)
        })
        e.addEventListener('error', (e) => {
          reject(e)
        })
      }))
      use(promise)
    }
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
  if (ns?.includes('svg')) {
    return newJSXNode({
      tag: 'title',
      props,
    })
  }
  return documentMetadataTag('title', props, true, false, false)
}

export const script: FC<
  PropsWithChildren<{
    async?: boolean
  }>
> = (props) => {
  return documentMetadataTag('script', props, !!props.async, false, true)
}

export const style: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('style', props, true, true, true)
}

export const link: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('link', props, true, true, true)
}

export const meta: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('meta', props, true, true, false)
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
  const onSubmit = useCallback<(e: SubmitEvent) => void>(async (e: Event) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    setData(formData)
    await action(formData)
    setData(null)
  }, [])

  const ref = composeRef(props.ref, (e: HTMLFormElement) => {
    e.addEventListener('submit', onSubmit)
    return () => {
      e.removeEventListener('submit', onSubmit)
    }
  })

  return newJSXNode({
    tag: FormContext as unknown as Function,
    props: {
      value: {
        pending: data !== null,
        data,
        method: props.method || 'get',
        action,
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
