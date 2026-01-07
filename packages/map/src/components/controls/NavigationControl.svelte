<script lang='ts'>
  import type { NavigationControlProps } from '../../types'
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../../context.svelte'

  const {
    position = 'top-right',
    showCompass = true,
    showZoom = true,
  }: NavigationControlProps = $props()

  // Get context - safe to call during init
  const ctx = getMapContext()

  let control: maplibregl.NavigationControl | null = null

  onMount(() => {
    // Get map from context (reactive getter)
    const map = ctx.map
    if (!map)
      return

    control = new maplibregl.NavigationControl({
      showCompass,
      showZoom,
      visualizePitch: true,
    })

    map.addControl(control, position)

    return () => {
      const currentMap = ctx.map
      if (control && currentMap) {
        currentMap.removeControl(control)
      }
      control = null
    }
  })
</script>
