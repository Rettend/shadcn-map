<script lang="ts">
  import { browser } from '$app/env'
  import { setWorkerUrl } from 'maplibre-gl'
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
  import { ModeWatcher } from 'mode-watcher'
  import favicon from '#lib/assets/favicon.svg'
  import ModeSwitcher from '#lib/components/ModeSwitcher.svelte'
  import 'virtual:uno.css'

  const { children } = $props()

  if (browser) {
    setWorkerUrl(workerUrl)
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher disableTransitions={false} />

<div class="right-4 top-4 fixed z-50">
  <ModeSwitcher />
</div>

<div class="w-dvw overflow-hidden h-dvh">
  {@render children()}
</div>
