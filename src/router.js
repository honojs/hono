// Ref: https://github.com/bmf-san/goblin

class Router {
  constructor() {
    this.node = new Node({ label: "/" })
  }
  add(method, path, handler) {
    return this.node.insert(method, path, handler);
  }
  match(method, path) {
    return this.node.search(method, path);
  }
}

class Node {
  constructor({ label, method, handler, children } = {}) {
    this.label = label || "";
    this.children = children || [];
    this.method = {};
    if (method) {
      this['method'][method] = handler || {}
    }
  }

  insert(method, path, handler) {
    let curNode = this
    if (path == '/') {
      curNode.label = path
      curNode['method'][method] = handler
    }
    const ps = this.splitPath(path)
    for (const p of ps) {
      let nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
      } else {
        curNode.children[p] = new Node({
          method: method, label: p, handler: handler, children: []
        })
        curNode = curNode.children[p]
      }
    }
    return this
  }

  splitPath(path) {
    const ps = []
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

  noRoute() {
    return null
  }

  search(method, path) {
    let curNode = this
    const params = {}

    for (const p of this.splitPath(path)) {
      const nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
        continue
      }
      if (Object.keys(curNode.children).length == 0) {
        if (curNode.label != p) {
          return this.noRoute()
        }
        break
      }
      let isParamMatch = false
      for (const key in curNode.children) {
        if (key == "*") { // Wildcard
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

    let handler = curNode['method']['all']
    if (!handler) {
      handler = curNode['method'][method];
    }
    if (!handler) {
      return this.noRoute()
    }
    return [handler, params]
  }
}

const proxyHandler = {
  get: (target, prop) => (...args) => {
    if (target.constructor.prototype.hasOwnProperty(prop)) {
      return target[prop](...args)
    } else {
      return target.add(prop, ...args)
    }
  }
}

const WrappedRouter = () => {
  return new Proxy(
    new Router(), proxyHandler
  )
}

module.exports = WrappedRouter