const methodNameOfAll = 'all'

class Result {
  constructor({ handler, params } = {}) {
    this.handler = handler || []
    this.params = params || {}
  }
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
    const ps = this.splitPath(path)
    for (const p of ps) {
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
    let ps = ['/']
    for (const p of path.split('/')) {
      if (p) {
        ps.push(p)
      }
    }
    return ps
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
    let [handler, params] = [, {}]

    if (path === '/') {
      const root = this.children['/']
      if (!root) return this.noRoute()
      // app.get('*', () => 'All')
      const rootAsterisk = root.children['*']
      if (rootAsterisk) {
        handler =
          rootAsterisk.method[method] || rootAsterisk.method[methodNameOfAll]
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
        }
        if (key.match(/^:/)) {
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
      handler || curNode.method[methodNameOfAll] || curNode.method[method]

    if (!handler) {
      return this.noRoute()
    }
    const res = new Result({ handler: handler, params: params })
    return res
  }

  noRoute() {
    return null
  }
}

module.exports = Node
