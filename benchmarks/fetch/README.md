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
ROUNDS=5 ./compare.sh
```

`compare.sh` runs each variant in a fresh process and reverses the variant order on every round, so that same-process JIT/GC warm-up and execution order do not bias the results. The summary reports the median of the per-round averages along with the raw values of every round.
