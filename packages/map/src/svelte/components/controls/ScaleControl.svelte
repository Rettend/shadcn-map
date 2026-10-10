<script lang="ts" module>
  import type { ControlPosition } from '../../../shared/types'

  export interface ScaleControlProps {
    /** Control position on map */
    position?: ControlPosition
    /** Unit of measurement */
    unit?: 'imperial' | 'metric' | 'nautical'
    /** Maximum width in pixels */
    maxWidth?: number
  }
</script>

<script lang="ts">
  import { ScaleControl as MapLibreScaleControl } from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../../context.svelte'

  const { position = 'bottom-left', unit = 'metric', maxWidth = 100 }: ScaleControlProps = $props()

  const ctx = getMapContext()

  let control: MapLibreScaleControl | null = null

  onMount(() => {
    const map = ctx.map
    if (!map) return

    control = new MapLibreScaleControl({
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
