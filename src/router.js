// Ref: https://github.com/bmf-san/goblin

class Router {
  constructor() {
    this.node = new Node({ label: "/" })
  }
  add(path, stuff) {
    this.node.insert(path, stuff);
  }
  match(path) {
    return this.node.search(path);
  }
}

class Node {
  constructor({ label, stuff, children } = {}) {
    this.label = label || "";
    this.stuff = stuff || {};
    this.children = children || [];
  }

  insert(path, stuff) {
    let curNode = this
    if (path == '/') {
      curNode.label = path
      curNode.stuff = stuff
    }
    const ps = this.splitPath(path)
    for (const p of ps) {
      let nextNode = curNode.children[p]
      if (nextNode) {
        curNode = nextNode
      } else {
        curNode.children[p] = new Node({ label: p, stuff: stuff, children: [] })
        curNode = curNode.children[p]
      }
    }
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

  search(path) {

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
    return [curNode.stuff, params]
  }
}

module.exports = Router
