export default function client() {
  document
    .querySelectorAll<HTMLFormElement | HTMLInputElement>(
      'form[action^="/hono-action-"], input[formaction^="/hono-action-"]'
    )
    .forEach((el) => {
      const form = el instanceof HTMLFormElement ? el : el.form
      const action = el.getAttribute(el instanceof HTMLFormElement ? 'action' : 'formaction')
      if (!form || !action) {
        return
      }

      const handler = async (ev: SubmitEvent | MouseEvent) => {
        ev.preventDefault()

        if (form.getAttribute('data-hono-disabled')) {
          form.setAttribute('data-hono-disabled', '1')
        }
        const formData = new FormData(form)
        const response = await fetch(action, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Hono-Action': 'true',
          },
        })

        if (response.headers.get('X-Hono-Action-Redirect')) {
          return (window.location.href = response.headers.get('X-Hono-Action-Redirect')!)
        }

        const component = document.querySelector<HTMLElement>(
          `hono-action[data-hono-action="${action}"]`
        )
        let removed = false
        if (component) {
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

            if (!removed) {
              component.innerHTML = ''
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
              component.appendChild(newComponent)
            })
          }
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
