const METHOD_NAME_OF_ALL = 'all'

const createResult = (handler, params) => {
  return { handler: handler, params: params }
}

class Node {
  constructor({ method, label, handler, children } = {}) {
    this.label = label || ''
    this.children = children || []
    this.method = {}
    if (method && handler) {
      this.method[method] = handler
    }
  }

  insert(method, path, handler) {
    let curNode = this
    for (const p of this.splitPath(path)) {
      let nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
      } else {
        curNode.children[p] = new Node({
          label: p,
          handler: handler,
        })
        curNode = curNode.children[p]
      }
    }
    curNode.method[method] = handler
  }

  splitPath(path) {
    return ['/', ...path.split('/').filter((p) => p !== '')]
  }

  getPattern(label) {
    // :id{[0-9]+}  → [0-9]+$
    // :id          → (.+)
    const match = label.match(/^\:.+?\{(.+)\}$/)
    if (match) {
      return '(' + match[1] + ')'
    }
    return '(.+)'
  }

  getParamName(label) {
    const match = label.match(/^\:([^\{\}]+)/)
    if (match) {
      return match[1]
    }
  }

  search(method, path) {
    let curNode = this
    let handler
    let params = {}

    if (path === '/') {
      const root = this.children['/']
      if (!root) return this.noRoute()
      // app.get('*', () => 'All')
      const rootAsterisk = root.children['*']
      if (rootAsterisk) {
        handler =
          rootAsterisk.method[method] || rootAsterisk.method[METHOD_NAME_OF_ALL]
      } else if (!root.method[method]) {
        return this.noRoute()
      }
    }

    for (const p of this.splitPath(path)) {
      let nextNode = curNode.children[p]

      if (nextNode) {
        curNode = nextNode
        continue
      }

      let isParamMatch = false
      for (const key in curNode.children) {
        if (key === '*') {
          // Wildcard
          curNode = curNode.children[key]
          isParamMatch = true
          break
        } else if (key.match(/^:/)) {
          const pattern = this.getPattern(key)
          const match = p.match(new RegExp(pattern))
          if (match) {
            const k = this.getParamName(key)
            params[k] = match[0]
            curNode = curNode.children[key]
            isParamMatch = true
            break
          }
          return this.noRoute()
        }
      }
      if (isParamMatch == false) {
        return this.noRoute()
      }
    }

    handler =
      handler || curNode.method[METHOD_NAME_OF_ALL] || curNode.method[method]

    if (!handler) {
      return this.noRoute()
    }

    return createResult(handler, params)
  }

  noRoute() {
    return null
  }
}

module.exports = Node
