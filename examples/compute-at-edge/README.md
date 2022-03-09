# Hono example for Fastly Compute@Edge

This is an example project with Hono\[炎\] for Fastly Compute@Edge.

## Features

- Minimal
- TypeScript
- [esbuild](https://github.com/evanw/esbuild) to build
- Fast
- Live reload
- Basic Auth middleware

## Usage

Install

```
$ yarn install
```

Rename and edit `fastly.toml`

```
$ mv fastly.example.toml fastly.toml
$ code fastly.toml
```

Develop

```
$ yarn dev
```

Deploy

```
$ yarn deploy
```

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
