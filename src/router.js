const Node = require('./node')

class Router {
  constructor() {
    this.node = new Node()
    this.tempPath = '/'
  }

  route(path) {
    this.tempPath = path
    return WrappedRouter(this)
  }

  addRoute(method, path, handler) {
    this.node.insert(method, path, handler)
    return WrappedRouter(this)
  }

  matchRoute(method, path) {
    method = method.toLowerCase()
    const res = this.node.search(method, path)
    return res
  }
}

const proxyHandler = {
  get:
    (target, prop) =>
    (...args) => {
      if (target.constructor.prototype.hasOwnProperty(prop)) {
        return target[prop](...args)
      } else {
        if (args.length === 1) {
          return target.addRoute(prop, target.tempPath, ...args)
        }
        return target.addRoute(prop, ...args)
      }
    },
}

const WrappedRouter = (router = new Router()) => {
  return new Proxy(router, proxyHandler)
}

module.exports = WrappedRouter
