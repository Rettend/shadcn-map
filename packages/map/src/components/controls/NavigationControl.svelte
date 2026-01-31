<script lang='ts' module>
  import type { ControlPosition } from '../../types'

  export interface NavigationControlProps {
    /** Control position on map */
    position?: ControlPosition
    /** Show compass */
    showCompass?: boolean
    /** Show zoom buttons */
    showZoom?: boolean
  }
</script>

<script lang='ts'>
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../../context.svelte'

  const {
    position = 'top-right',
    showCompass = true,
    showZoom = true,
  }: NavigationControlProps = $props()

  const ctx = getMapContext()

  let control: maplibregl.NavigationControl | null = null

  onMount(() => {
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
