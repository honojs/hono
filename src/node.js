const { splitPath, getPattern, getParamName } = require('./util')

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
    for (const p of splitPath(path)) {
      const nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
        continue
      }
      curNode.children[p] = new Node({
        label: p,
        method: method,
        handler: handler,
      })
      curNode = curNode.children[p]
    }
    curNode.method[method] = handler
    return curNode
  }

  search(method, path) {
    let curNode = this
    const params = {}
    const parts = splitPath(path)

    for (const [i, p] of parts.entries()) {
      const nextNode = curNode.children[p]

      if (nextNode) {
        curNode = nextNode
        continue
      }

      let isParamMatch = false
      for (const key in curNode.children) {
        // Wildcard
        if (key === '*') {
          curNode = curNode.children[key]
          isParamMatch = true
          break
        } else if (key.match(/^:/)) {
          const pattern = getPattern(key)
          const match = p.match(new RegExp(pattern))
          if (match) {
            const k = getParamName(key)
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

      if (i === parts.length - 1) {
        break
      }
    }

    const handler = curNode.method[METHOD_NAME_OF_ALL] || curNode.method[method]

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
