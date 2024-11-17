import * as fs from 'node:fs/promises'

async function main() {
    const args = process.argv.slice(2);
    const filePath = args[0];

    const bundleSize = (await fs.readFile(filePath)).byteLength
    const metrics = []
    metrics.push({
        key: 'bundle-size',
        name: 'Bundle Size',
        value: bundleSize,
        unit: 'B'
    })
    const diagnostics = {
        key: "bundle-check",
        name: "Bundle check",
        metrics
    }
    console.log(JSON.stringify(diagnostics, null, 2))
}

main()
