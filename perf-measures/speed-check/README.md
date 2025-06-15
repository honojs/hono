# Hono HTTP Benchmark

A performance benchmarking tool for measuring HTTP performance of Hono.

This tool is inspired by and references the [bun-http-framework-benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark) project, adapting some test patterns and bombardier usage.

## 📋 Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [bombardier](https://github.com/codesenberg/bombardier) - `brew install bombardier` (macOS) or download from releases

## 🚀 Usage

```bash
cd perf-measures/speed-check

# Compare current branch vs main
bun run scripts/benchmark.ts

# Compare against specific version
bun run scripts/benchmark.ts --baseline=v4.7.11

# Custom configuration
bun run scripts/benchmark.ts --baseline=main --target=current --runs=3

# CI mode (current branch only, JSON output for octocov)
bun run scripts/benchmark.ts --ci
```

## 📊 Metrics

- **Ping**: `GET /` - Basic response performance
- **Query**: `GET /id/:id?name=bun` - Parameter handling performance
- **Body**: `POST /json` - JSON processing performance

## 📁 Output

### Console Output

```txt
|  Framework       | Runtime | Average | Ping       | Query      | Body       |
| ---------------- | ------- | ------- | ---------- | ---------- | ---------- |
| hono (main) | bun | 77,413.913 | 91,466.05 | 73,813.05 | 66,962.64 |
| hono (current) | bun | 77,151.263 | 90,319.35 | 73,774.59 | 67,359.85 |

Performance change: -0.34%
```

### File Output

`benchmark-results.json` - Results data in JSON format

## 🏗️ How it works

1. **Build**: Checkout and build specified Git revisions
2. **Test**: Verify endpoints work correctly
3. **Benchmark**: Run bombardier load tests
4. **Results**: Output performance comparison
