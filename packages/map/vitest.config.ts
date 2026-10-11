import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [solid({ compiler: 'native', extensions: ['.jsx', '.tsx'] })],
  resolve: {
    conditions: ['browser', 'development'],
    dedupe: ['solid-js', '@solidjs/web', 'maplibre-gl'],
  },
  test: {
    environment: 'happy-dom',
    include: ['test/solid/**/*.test.tsx'],
  },
})
