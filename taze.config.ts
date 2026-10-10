import { defineConfig } from 'taze'

export default defineConfig({
  packageMode: {
    // Svelte packaging and linting need the TypeScript 6 compiler API.
    typescript: 'patch',
    // Vite+ owns compatible versions of its bundled tools.
    vite: 'ignore',
    'vite-plus': 'ignore',
    // Upgrade the Solid runtime and compiler prereleases together.
    'solid-js': 'ignore',
    '/^@solidjs/': 'ignore',
    // The latest tag still points to the older Svelte 4 release.
    'vaul-svelte': 'ignore',
  },
})
