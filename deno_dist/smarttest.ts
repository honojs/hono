class SmartRouter {
  private routes: any[] = []

  add(route) {
    this.routes.push(route)
  }

  match(method, path) {
    let router, result
    try {
      router = new StaticRouter()
      result = router.match(method, path)
    } catch (e) {
      try {
        router = new RegExpRouter()
        result = router.match(method, path)
      } catch (e) {
        try {
          router = new TrieRouter()
          result = router.match(method, path)
        } catch (e) {
          throw Error()
        }
      }
    }
    this.match = router.match.bind(router)
    return result
  }
}
