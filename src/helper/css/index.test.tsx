import { jsx, Fragment, JSXNode } from '../../jsx'
import { html } from '../../helper/html'
import { css, Style } from './index'
import { HtmlEscapedCallbackPhase, HtmlEscapedString, resolveCallback } from '../../utils/html'

async function toString(template: JSXNode | Promise<HtmlEscapedString> | HtmlEscapedString) {
  if (template instanceof Promise) template = await template
  if (template instanceof JSXNode) template = template.toString() as Promise<HtmlEscapedString>
  return resolveCallback(
    await template,
    HtmlEscapedCallbackPhase.Stringify,
    false,
    template
  )
}

describe('CSS Helper', () => {
  it('Should render CSS styles with JSX', async () => {
    const HeaderClass = css`
      background-color: blue;
      color: white;
      padding: 1rem;
    `
    const template = (
      <>
        <Style />
        <h1 class={HeaderClass}>Hello!</h1>
      </>
    )
    expect(await toString(template)).toBe(
      '<style id="hono-css">.css-4167396862{background-color: blue; color: white; padding: 1rem;}</style><h1 class="css-4167396862">Hello!</h1>'
    )
  })

  it('Should render CSS styles with `html` tag function', async () => {
    const HeaderClass = css`
      background-color: blue;
      color: white;
      padding: 1rem;
    `
    const template = html`${Style()}<h1 class="${HeaderClass}">Hello!</h1>`
    expect(await toString(template)).toBe(
      '<style id="hono-css">.css-4167396862{background-color: blue; color: white; padding: 1rem;}</style><h1 class="css-4167396862">Hello!</h1>'
    )
  });
})
