import { renderToString } from 'react-dom/server'
import { buildPage } from './page-react.tsx'

export const render = () => renderToString(buildPage()() as any)
