<script lang='ts'>
  import type { ScaleControlProps } from '../../types'
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../../context.svelte'

  const {
    position = 'bottom-left',
    unit = 'metric',
    maxWidth = 100,
  }: ScaleControlProps = $props()

  // Get context - safe to call during init
  const ctx = getMapContext()

  let control: maplibregl.ScaleControl | null = null

  onMount(() => {
    // Get map from context (reactive getter)
    const map = ctx.map
    if (!map)
      return

    control = new maplibregl.ScaleControl({
      maxWidth,
      unit,
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
