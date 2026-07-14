# fetch benchmark

Measure `app.fetch()` overhead in-process.

```sh
bun bench.mts
node bench.mts
```

Compare working tree vs a git ref (default: `main`):

```sh
./compare.sh
./compare.sh v4.12.0
RUNTIME=node ./compare.sh
```
