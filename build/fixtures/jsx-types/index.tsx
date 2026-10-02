import type { JSX } from 'hono/jsx'

declare module 'hono/jsx' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'custom-element': JSX.HTMLAttributes
    }
  }
}

export const button = (
  <button disabled={false} class='button'>
    Hello
  </button>
)
export const customElement = <custom-element class='custom' />

// @ts-expect-error Native boolean attributes must reject strings.
export const invalidButton = <button disabled='yes' />

// @ts-expect-error Native class attributes must reject numbers.
export const invalidClass = <button class={123} />

// @ts-expect-error Augmented custom elements must retain their attribute types.
export const invalidCustomElement = <custom-element class={123} />
