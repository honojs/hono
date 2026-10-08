export default function client() {
  const init = () => {
    document
      .querySelectorAll<
        HTMLFormElement | HTMLInputElement
      >('form[action^="/hono-action-"], input[formaction^="/hono-action-"]')
      .forEach((el) => {
        const form = el instanceof HTMLFormElement ? el : el.form
        const action = el.getAttribute(el instanceof HTMLFormElement ? 'action' : 'formaction')
        if (!form || !action) {
          return
        }

        const handler = async (ev: SubmitEvent | MouseEvent) => {
          const commentNodes = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, {
            acceptNode: (node) => {
              return node.nodeValue?.includes(action)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT
            },
          })
          const startNode = commentNodes.nextNode()
          const endNode = commentNodes.nextNode()
          if (!startNode || !endNode) {
            return
          }

          ev.preventDefault()

          const props = startNode.nodeValue?.split('props:')[1] || '{}'

          if (form.getAttribute('data-hono-disabled')) {
            form.setAttribute('data-hono-disabled', '1')
          }
          const formData = new FormData(form)
          const response = await fetch(action, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Hono-Action': 'true',
              'X-Hono-Action-Props': props,
            },
          })

          if (response.headers.get('X-Hono-Action-Redirect')) {
            return (window.location.href = response.headers.get('X-Hono-Action-Redirect')!)
          }

          let removed = false
          const stream = response.body
          if (!stream) {
            return
          }
          const reader = stream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            // FIXME: Replace only the difference
            if (!removed) {
              for (
                let node: ChildNode | null | undefined = startNode.nextSibling;
                node !== endNode;
              ) {
                const next: ChildNode | null | undefined = node?.nextSibling
                node?.parentNode?.removeChild(node)
                node = next
              }
              removed = true
            }

            const decoder = new TextDecoder()
            const chunk = decoder.decode(value, { stream: true })
            const parser = new DOMParser()
            const doc = parser.parseFromString(chunk, 'text/html')
            const newComponents = [...doc.head.childNodes, ...doc.body.childNodes] as HTMLElement[]
            newComponents.forEach((newComponent) => {
              if (newComponent.tagName === 'SCRIPT') {
                const script = newComponent.innerHTML
                newComponent = document.createElement('script')
                newComponent.innerHTML = script
              }
              endNode.parentNode?.insertBefore(newComponent, endNode)
            })
          }

          form.removeAttribute('data-hono-disabled')
        }

        if (el instanceof HTMLFormElement) {
          form.addEventListener('submit', handler)
        } else {
          form.addEventListener('click', handler)
        }
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}
