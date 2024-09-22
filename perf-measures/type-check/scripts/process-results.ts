import * as fs from 'node:fs/promises'

async function main() {
    const currentResult = (await fs.readFile('./result.txt')).toString().split('\n')
    const previousResult = await fs.readFile('./previous-result.txt')
        .then((data) => data.toString().split('\n'))
        .catch(() => null)
    const table = ['|| Current | Previous |', '|---|---|---|']    
    for (const [i, line] of currentResult.entries()) {
        if (line === '') {continue}
        const [name, value] = line.split(':')
        const mainValue = previousResult?.[i]?.split(':')?.[1]
        table.push(`| ${name?.trim()} | ${value?.trim()} | ${mainValue ? mainValue.trim() : 'N/A'} |`)
    }
    console.log(table.join('\n'))
}

main()
