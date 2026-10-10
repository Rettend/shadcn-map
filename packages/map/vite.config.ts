import { spawn } from 'node:child_process'
import { globSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite-plus'

const require = createRequire(import.meta.url)
const sveltePackage = resolve(
  dirname(require.resolve('@sveltejs/package/package.json')),
  'svelte-package.js',
)

function packageSvelte(cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [sveltePackage, '-i', 'src'], {
      cwd,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`svelte-package failed (${signal ?? `exit ${code}`}).`))
    })
  })
}

export default defineConfig({
  pack: {
    entry: { index: 'src/solid/index.tsx' },
    // Preserve JSX for the consumer's Solid plugin using this compiler config.
    tsconfig: 'tsconfig.solid.json',
    outDir: 'dist/solid',
    format: 'esm',
    platform: 'neutral',
    target: 'esnext',
    sourcemap: true,
    // Svelte packaging cleans dist; the buildStart hook handles dist/solid afterward.
    clean: false,
    hooks: {
      'build:before': ({ options, buildOptions }) => {
        buildOptions.plugins = [
          {
            name: 'package-svelte',
            buildStart: {
              order: 'pre',
              async handler() {
                this.addWatchFile(resolve(options.cwd, 'src'))
                this.addWatchFile(resolve(options.cwd, 'svelte.config.js'))
                this.addWatchFile(resolve(options.cwd, 'tsconfig.json'))

                // Await this on every rebuild, not just when the watcher starts.
                await packageSvelte(options.cwd)
                const dist = resolve(options.cwd, 'dist')
                for (const file of globSync('**/*.test.*', { cwd: dist })) {
                  await rm(resolve(dist, file), { force: true })
                }
                // svelte-package copies raw Solid files; replace them with the bundle.
                await rm(resolve(options.cwd, 'dist/solid'), { recursive: true, force: true })
              },
            },
          },
          buildOptions.plugins,
        ]
      },
    },
    dts: {
      // Keep TypeScript 6's compiler API for declarations; use TypeScript 7 for checking.
      generator: 'tsc',
    },
    deps: {
      neverBundle: ['@solidjs/web', 'maplibre-gl', 'pmtiles', 'solid-js', 'supercluster'],
    },
    css: {
      fileName: 'index.css',
      target: false,
    },
    outputOptions: {
      codeSplitting: false,
    },
    outExtensions: () => ({ js: '.jsx', dts: '.d.ts' }),
  },
})
