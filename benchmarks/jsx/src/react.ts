import { createElement, Fragment } from 'react'
import { renderToString } from 'react-dom/server'
import { buildPage } from './page-react'

export const render = () => renderToString(buildPage({ jsx: createElement, Fragment })() as any)
