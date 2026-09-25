/**
 * Release an adapter package in `adapters/*`.
 *
 * Usage: pnpm run release:adapter <name> <patch|minor|major|x.y.z>
 *
 * Bumps the version, commits, tags `@hono/<name>@<version>` and pushes.
 * The `release` workflow then runs `npm stage publish` for that tag.
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

if (execSync('git status --porcelain').toString().trim()) {
  console.error('Working tree is not clean. Commit or stash your changes first.')
  process.exit(1)
}

run(`npm version ${bump} --no-git-tag-version`, dir)

const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
const tag = `${pkg.name}@${pkg.version}`

run(`git add ${join(dir, 'package.json')}`)
run(`git commit -m "chore(adapters): release ${tag}"`)
run(`git tag ${tag}`)
run(`git push --follow-tags`)

console.log(
  `\nTagged ${tag}. Approve the staged version on npm once the release workflow finishes.`
)
