# Hono HTTP Benchmark

HTTP performance benchmarking tool that compares main vs current versions.

## Usage

### In Pull Requests

Comment `/benchmark` on any pull request to run the HTTP benchmark and get performance comparison results.

### Local Development

```bash
cd benchmarks/http-server
bun run benchmark.ts
```

## Prerequisites

- Bun v1.0+
- bombardier (`brew install bombardier` on macOS)
