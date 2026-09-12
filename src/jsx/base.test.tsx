/** @jsxImportSource ./ */

import type { HtmlEscapedString } from '../utils/html'
import type { Child, JSXNode } from './base'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cloneElement, jsx, Fragment } from './base'

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

  it('should clone an element with new children', () => {
    const fnElement = ({ message }: { message: string }) => <div>{message}</div>
    const element = fnElement({ message: 'Hello' })
    const clonedElement = cloneElement(element, {}, 'World')
    expect(element.toString()).toBe('<div>Hello</div>')
    expect(clonedElement.toString()).toBe('<div>World</div>')
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

  it('should escape a string returned by an asynchronous component', async () => {
    const Async = async () => '<img src=x onerror=alert(1)>' as unknown as HtmlEscapedString

    expect(
      String(
        await (
          <div>
            <Async />
          </div>
        ).toString()
      )
    ).toBe('<div>&lt;img src=x onerror=alert(1)&gt;</div>')
  })

  it('should omit an unsupported object child', () => {
    const object = { toString: () => 'plain-text' }

    expect((<div>{object as never}</div>).toString()).toBe('<div></div>')
  })
})
