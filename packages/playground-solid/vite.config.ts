import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  resolve: {
    dedupe: ['solid-js', '@solidjs/web'],
  },
  plugins: [
    solid({
      extensions: ['.jsx', '.tsx'],
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1_000,
  },
})
