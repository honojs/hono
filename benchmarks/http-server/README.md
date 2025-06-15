# Hono HTTP Benchmark

HTTP performance benchmarking tool that compares main vs current versions.

## Usage

### In Pull Requests

HTTP benchmarks are automatically run for each pull request and results are commented on the PR.

### Local Development

```bash
cd benchmarks/http-server
bun run benchmark.ts
```

## Prerequisites

- Bun v1.0+
- bombardier (`brew install bombardier` on macOS)
