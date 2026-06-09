/** @jsxImportSource ./ */

import type { Child, JSXNode } from './base'
import { cloneElement, jsx, Fragment, memo } from './base'

describe('cloneElement', () => {
  it('should clone an element with new props', () => {
    const element = <div className='original'>Hello</div>
    const clonedElement = cloneElement(element, { className: 'cloned' })
    expect((clonedElement as unknown as JSXNode).props.className).toBe('cloned')
    expect((clonedElement as unknown as JSXNode).props.children).toBe('Hello')
  })

  it('should clone a children element', () => {
    const fnElement = ({ message }: { message: string }) => <div>{message}</div>
    const element = fnElement({ message: 'Hello' })
    const clonedElement = cloneElement(element, {})
    expect(element.toString()).toBe('<div>Hello</div>')
    expect(clonedElement.toString()).toBe('<div>Hello</div>')
  })

  it('should accept fnElement with promise return', async () => {
    const FnElement = async ({ message }: { message: string }) => {
      return <div>{message}</div>
    }
    const element = <FnElement message='Hello' />
    const clonedElement = cloneElement(element, {})

    expect((await element.toString()).toString()).toBe('<div>Hello</div>')
    expect((await clonedElement.toString()).toString()).toBe('<div>Hello</div>')
  })

  it('should escape string returned by function component', () => {
    const Text = () => '<span>Hello</span>'
    const element = jsx(Text, null)
    expect(element.toString()).toBe('&lt;span&gt;Hello&lt;/span&gt;')
  })

  it('should reuse memoized result for the same props object', () => {
    const component = vi.fn(({ message }: { message: string }) => <div>{message}</div>)
    const MemoizedComponent = memo(component)
    const props = { message: 'Hello' }

    expect(MemoizedComponent(props)?.toString()).toBe('<div>Hello</div>')
    expect(MemoizedComponent(props)?.toString()).toBe('<div>Hello</div>')
    expect(component).toHaveBeenCalledTimes(1)
  })

  it('should recompute memoized result when props key count changes', () => {
    const component = vi.fn(({ message, id }: { message: string; id?: string }) => (
      <div id={id}>{message}</div>
    ))
    const MemoizedComponent = memo(component)

    expect(MemoizedComponent({ message: 'Hello' })?.toString()).toBe('<div>Hello</div>')
    expect(MemoizedComponent({ message: 'Hello', id: 'message' })?.toString()).toBe(
      '<div id="message">Hello</div>'
    )
    expect(component).toHaveBeenCalledTimes(2)
  })

  it('should reuse memoized result when children props are empty arrays', () => {
    const component = vi.fn(({ children }: { children: Child[] }) => <div>{children}</div>)
    const MemoizedComponent = memo(component)

    expect(MemoizedComponent({ children: [] })?.toString()).toBe('<div></div>')
    expect(MemoizedComponent({ children: [] })?.toString()).toBe('<div></div>')
    expect(component).toHaveBeenCalledTimes(1)
  })

  it('should return null when ref is not provided', () => {
    const element = (<div>Hello</div>) as unknown as JSXNode
    expect(element.ref).toBeNull()
  })

  it('should ignore style with null', () => {
    const element = (<div style={{ color: null }}>Hello</div>) as unknown as JSXNode
    expect(element.toString()).toBe('<div style="">Hello</div>')
  })

  it('should clone an element with new children', () => {
    const fnElement = ({ message }: { message: string }) => <div>{message}</div>
    const element = fnElement({ message: 'Hello' })
    const clonedElement = cloneElement(element, {}, 'World')
    expect(element.toString()).toBe('<div>Hello</div>')
    expect(clonedElement.toString()).toBe('<div>World</div>')
  })

  it('should clone an element with existing children array', () => {
    const element = (
      <div>
        <span>Hello</span>
        <span>World</span>
      </div>
    )
    const clonedElement = cloneElement(element, {})

    expect(clonedElement.toString()).toBe('<div><span>Hello</span><span>World</span></div>')
  })

  it('should self-close a wrapped empty tag', () => {
    const Hr = ({ ...props }) => <hr {...props} />
    const element = <Hr />
    expect(element.toString()).toBe('<hr/>')
  })
})

describe('createElement', () => {
  it('should preserve the SVG element shape', () => {
    const ref = { current: null }
    const element = jsx('svg', { ref }) as unknown as JSXNode
    expect(element.tag).toBe('svg')
    expect(element.type).toBe('svg')
    expect(element.ref).toBe(ref)
  })

  it('should accept a Child-typed value as a child', () => {
    const child: Child = <span>inner</span>
    const element = jsx('div', null, child) as unknown as JSXNode
    expect(element.toString()).toBe('<div><span>inner</span></div>')
  })
})
