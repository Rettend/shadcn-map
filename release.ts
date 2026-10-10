import { defineConfig } from '@rttnd/release'

const registry = 'https://registry.npmjs.org'
const publish = ['bun', 'publish', '--cwd', 'packages/map', '--registry', registry]

export default defineConfig({
  versionFiles: ['packages/map/package.json'],
  commitFiles: ['bun.lock'],
  prepare: 'bun release.ts --prepare',
  publish: 'bun release.ts --publish',
})

async function run(args: string[]) {
  const child = Bun.spawn(args, { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' })
  if ((await child.exited) !== 0) throw new Error(`${args.join(' ')} failed.`)
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--prepare') {
    await run(['bun', 'install', '--lockfile-only', '--ignore-scripts', '--offline'])
    await run(['bun', 'run', 'check'])
    await run(['bun', 'run', 'test'])
    await run(['bun', 'run', '--filter', 'playground-*', 'build'])
    await run([...publish, '--dry-run'])
  } else if (args.length === 1 && args[0] === '--publish') {
    await run(publish)
  } else {
    // The CLI cannot discover npm authentication behind the Bun publish hook.
    if (!(args.length === 1 && ['--help', '-h', '--version', '-v'].includes(args[0]!))) {
      await run(['bun', 'pm', 'whoami', '--cwd', 'packages/map', '--registry', registry])
    }
    await run(['bun', 'node_modules/@rttnd/release/dist/cli.js', '--config', 'release.ts', ...args])
  }
}
