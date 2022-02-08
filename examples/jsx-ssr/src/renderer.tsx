import Nano from 'nano-jsx'
import { Helmet } from 'nano-jsx'

export const render = (component: any) => {
  const app = Nano.renderSSR(component)
  const { body, head, footer, attributes } = Helmet.SSR(app)
  const html = `
<!DOCTYPE html>
<html ${attributes.html.toString()}>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel='stylesheet' href='//cdnjs.cloudflare.com/ajax/libs/mini.css/3.0.1/mini-default.min.css' />
    ${head.join('\n')}
  </head>
  <body ${attributes.body.toString()} style="padding: 1em 2em">
    ${body}
    ${footer.join('\n')}
  </body>
</html>`
  return html
}
