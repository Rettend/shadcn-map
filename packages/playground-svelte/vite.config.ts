import adapter from '@sveltejs/adapter-auto'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import extractorSvelte from '@unocss/extractor-svelte'
import UnoCSS from '@unocss/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [
    UnoCSS({
      extractors: [extractorSvelte()],
    }),
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
    }),
  ],
})
