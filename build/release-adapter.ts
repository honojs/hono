/**
 * Release an adapter package in `adapters/*`.
 *
 * Usage: pnpm run release:adapter <name> <patch|minor|major|x.y.z>
 *
 * Bumps the version, commits, tags `@hono/<name>@<version>` and pushes.
 * The `release` workflow then runs `npm stage publish` for that tag.
 * Finally prints a release-note draft built from the commits that touched
 * the adapter since its previous tag, with a link to create a GitHub Release.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const [name, bump] = process.argv.slice(2)
if (!name || !bump) {
  console.error('Usage: pnpm run release:adapter <name> <patch|minor|major|x.y.z>')
  process.exit(1)
}

const dir = join('adapters', name)
const run = (cmd: string, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' })
const capture = (cmd: string) =>
  execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()

if (capture('git status --porcelain')) {
  console.error('Working tree is not clean. Commit or stash your changes first.')
  process.exit(1)
}

const pkgPath = join(dir, 'package.json')
const pkgName: string = JSON.parse(readFileSync(pkgPath, 'utf8')).name

// Collect commits that touched the adapter since its previous tag, before creating the new one.
let previousTag = ''
try {
  previousTag = capture(`git describe --tags --abbrev=0 --match "${pkgName}@*"`)
} catch {
  // first release: no previous tag
}
const range = previousTag ? `${previousTag}..HEAD` : 'HEAD'
const changes = capture(`git log ${range} --pretty=format:"- %s" -- ${dir}`)
  .split('\n')
  .filter((line) => line && !line.startsWith('- chore(adapters): release '))

run(`npm version ${bump} --no-git-tag-version`, dir)

const version: string = JSON.parse(readFileSync(pkgPath, 'utf8')).version
const tag = `${pkgName}@${version}`

run(`git add ${pkgPath}`)
run(`git commit -m "chore(adapters): release ${tag}"`)
run(`git tag -a ${tag} -m ${tag}`)
run(`git push origin HEAD ${tag}`)

const notes = ["## What's Changed", '', ...changes].join('\n')
const releaseUrl = new URL('https://github.com/honojs/hono/releases/new')
releaseUrl.searchParams.set('tag', tag)
releaseUrl.searchParams.set('title', tag)
releaseUrl.searchParams.set('body', notes)

console.log(
  `\nTagged ${tag}. Approve the staged version on npm once the release workflow finishes.\n`
)
console.log(notes)
console.log(`\nCreate a GitHub Release (optional):\n${releaseUrl}`)
