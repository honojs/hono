/** @jsxImportSource ./ */

import type { JSXNode } from './base'
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
