const methodNameOfAll = 'all'

class Result {
  constructor({ handler, params } = {}) {
    this.handler = handler
    this.params = params || {}
  }
}

class Node {
  constructor({ method, label, handler, children } = {}) {
    this.label = label || '/'
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
          method: method,
          label: p,
          handler: handler,
        })
        curNode = curNode.children[p]
      }
    }
    // XXX
    if (!curNode.method[method]) {
      curNode.method[method] = handler
    }
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
    const params = {}
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

    let handler = curNode.method[methodNameOfAll] || curNode.method[method]

    if (handler) {
      const res = new Result({ handler: handler, params: params })
      return res
    } else {
      return this.noRoute()
    }
  }

  noRoute() {
    return null
  }
}

module.exports = Node
