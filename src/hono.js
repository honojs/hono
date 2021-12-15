const Router = require('./router')

class Route {
  constructor(method, handler) {
    this.method = method;
    this.handler = handler;
  }
}

class App {
  constructor() {
    this.router = new Router();
  }

  addRoute(method, path, handler) {
    this.router.add(path, new Route(method, handler))
  }

  handle(event) {
    const result = this.dispatch(event.request)
    const response = this.filter(result)
    return event.respondWith(response)
  }

  filter(result) {
    if (result instanceof Response) {
      return result
    }
    if (typeof (result) === 'object') {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    if (typeof (result) === 'string') {
      return new Response(result, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }
    return this.notFound()
  }

  dispatch(request) {
    const url = new URL(request.url)
    const path = url.pathname
    const match = this.router.match(path)

    if (!match) {
      return this.notFound()
    }

    const method = request.method.toLowerCase()
    const route = match[0]
    if (route.method == method) {
      const handler = route.handler
      return handler(request)
    }
    return this.notFound()
  }

  notFound() {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain'
      }
    })
  }

  fire() {
    addEventListener("fetch", (event) => {
      this.handle(event)
    })
  }
}

const proxyHandler = {
  get: (target, prop) => (...args) => {
    if (target.constructor.prototype.hasOwnProperty(prop)) {
      return target[prop](args[0])
    } else {
      target.addRoute(prop, args[0], args[1])
      return
    }
  }
}

const app = new App()

function Hono() {
  return new Proxy(
    app, proxyHandler
  )
}

module.exports = Hono