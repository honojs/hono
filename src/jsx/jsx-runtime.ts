export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'

import { raw, html } from '../helper/html'
export { html as jsxTemplate }
export const jsxAttr = (name: string, value: string) => raw(name + '="' + html`${value}` + '"')
export const jsxEscape = (value: string) => value
