import * as fs from 'node:fs'

async function main() {
    const args = process.argv.slice(2);
    const filePath = args[0];

    const bundleSize = fs.statSync(filePath).size
    const metrics = []
    metrics.push({
        key: 'bundle-size',
        name: 'Bundle Size',
        value: bundleSize,
        unit: 'B'
    })
    const diagnostics = {
        key: "bundle-size-check",
        name: "Bundle size check",
        metrics
    }
    console.log(JSON.stringify(diagnostics, null, 2))
}

main()
