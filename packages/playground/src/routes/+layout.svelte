<script lang='ts'>
  import favicon from '$lib/assets/favicon.svg'
  import ModeSwitcher from '$lib/components/ModeSwitcher.svelte'
  import { ModeWatcher } from 'mode-watcher'
  import 'virtual:uno.css'

  const { children } = $props()
</script>

<svelte:head>
  <link rel='icon' href={favicon} />
</svelte:head>

<ModeWatcher disableTransitions={false} />
<ModeSwitcher />
{@render children()}
