# Maintaining

Notes for maintainers of this repository.

## Adapters

Runtime adapters live in `adapters/*` and are published as separate packages (`@hono/bun`, ...). Each directory is a pnpm workspace package. The root package is `hono` itself.

### Layout

```
adapters/bun/
  src/            # imports hono via `hono`, `hono/ws`, ... (workspace link)
  src/*.test.ts   # runs with `bun test`
  package.json    # peerDependencies: hono >=x.y.z
  vite.config.ts  # `vp pack` config, same three-pass layout as hono
```

### Commands

From the repository root:

```sh
pnpm run build:adapters   # build every adapter
pnpm run test:adapters    # tsc + bun test for every adapter
pnpm --filter @hono/bun run test
```

CI runs `ci-adapters.yml` for changes under `adapters/**` (and `src/**`, since adapters depend on `hono`). The main `ci.yml` skips changes that only touch `adapters/**`.

### Versioning

- Adapter versions are independent from `hono`. Do not bump them when `hono` is released.
- Compatibility is expressed by `peerDependencies.hono` in each adapter. Raise the lower bound when an adapter starts using something newer.
- Git tags are `@hono/<name>@<version>`. Only `hono` uses `v<version>`.

### Releasing

```sh
pnpm run release:adapter bun patch   # or minor, major, or an exact x.y.z
```

This bumps `adapters/bun/package.json`, commits, creates an annotated tag `@hono/bun@<version>` and pushes. The `release.yml` workflow then packs the adapter and runs `npm stage publish`. Approve the staged version on npm (2FA) to make it public.

At the end the script prints a release-note draft built from the commits that touched `adapters/bun` since the previous adapter tag, plus a prefilled GitHub "new release" link. Creating a GitHub Release is optional.

### Adding a new adapter

1. Copy `adapters/bun` as `adapters/<name>` and adjust `package.json` (`name`, `description`) and the sources.
2. The workspace picks it up automatically (`pnpm-workspace.yaml` has `adapters/*`).
3. Add it to the corresponding `src/adapter/<name>` with `@deprecated` on each export, pointing to the new package.
4. **First publish is manual.** npm only allows a Trusted Publisher on a package that already exists:
   1. Set the version in `adapters/<name>/package.json` and merge it.
   2. Build it: `pnpm --filter @hono/<name> run build` (`pnpm publish` does not build).
   3. In `adapters/<name>`, run `pnpm publish --access public` with your npm 2FA.
   4. On npmjs.com, open the package settings and add a Trusted Publisher: repository `honojs/hono`, workflow `release.yml`.
5. From the second release on, use `pnpm run release:adapter <name> <bump>`.
