# hono

Minimal web framework for Cloudflare Workers.

## Install

```sh
$ yarn add hono
```

or

```sh
$ npm install hono
```

## Hello hono!

```js
const Hono = require("hono");
const app = Hono();

app.get("/", () => new Response("Hono!!"));

app.fire(); // call `addEventListener`
```

Then, run `wrangler dev`.

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
