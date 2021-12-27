'use strict'

const { splitPath, getPattern } = require('./util')

const METHOD_NAME_OF_ALL = 'all'

const createResult = (handler, params) => {
  return { handler: handler, params: params }
}

class Node {
  constructor({ method, handler, children } = {}) {
    this.children = children || []
    this.method = {}
    if (method && handler) {
      this.method[method] = handler
    }
  }

  insert(method, path, handler) {
    let curNode = this
    const parts = splitPath(path)
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (Object.keys(curNode.children).includes(p)) {
        curNode = curNode.children[p]
        continue
      }
      curNode.children[p] = new Node({
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

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      const nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
        continue
      }

      let isParamMatch = false
      const keys = Object.keys(curNode.children)
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j]
        // Wildcard
        if (key === '*') {
          curNode = curNode.children['*']
          isParamMatch = true
          break
        }
        const pattern = getPattern(key)
        if (pattern) {
          const match = p.match(new RegExp(pattern[1]))
          if (match) {
            const k = pattern[0]
            params[k] = match[1]
            curNode = curNode.children[key]
            isParamMatch = true
            break
          }
          return this.noRoute()
        }
      }

      if (isParamMatch === false) {
        return this.noRoute()
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
