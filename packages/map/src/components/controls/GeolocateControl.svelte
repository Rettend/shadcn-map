<script lang='ts' module>
  import type { ControlPosition } from '../../types'

  export interface GeolocateControlProps {
    /** Control position on map */
    position?: ControlPosition
    /** Zoom level to fly to when locating */
    zoom?: number
    /** High accuracy geolocation (may be slower / use more battery) */
    enableHighAccuracy?: boolean
    /** Maximum cached position age in ms */
    maximumAge?: number
    /** Timeout in ms */
    timeout?: number
    /** Called with found coordinates */
    onlocate?: (lngLat: [number, number]) => void
    /** Called when geolocation fails */
    onerror?: (error: GeolocationPositionError | Error) => void
    /** Accessible label */
    ariaLabel?: string
  }
</script>

<script lang='ts'>
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../../context.svelte'

  const {
    position = 'bottom-right',
    zoom = 14,
    enableHighAccuracy = true,
    maximumAge = 30_000,
    timeout = 10_000,
    onlocate,
    onerror,
    ariaLabel = 'Go to my location',
  }: GeolocateControlProps = $props()

  const ctx = getMapContext()

  type ControlLike = {
    onAdd(map: MapLibreMap): HTMLElement
    onRemove(map: MapLibreMap): void
  }

  let control: ControlLike | null = null
  let mountedMap: MapLibreMap | null = null

  function handleClick() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onerror?.(new Error('Geolocation is not available in this environment.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        ctx.flyTo(lngLat, { zoom })
        onlocate?.(lngLat)
      },
      (err) => {
        onerror?.(err)
      },
      { enableHighAccuracy, maximumAge, timeout },
    )
  }

  onMount(() => {
    const map = ctx.map
    if (!map) {
      return
    }

    control = {
      onAdd() {
        const container = document.createElement('div')
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group shadcn-geolocate'

        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'maplibregl-ctrl-icon shadcn-geolocate-btn'
        button.setAttribute('aria-label', ariaLabel)

        // Simple target icon (SVG) so we don't require icon libraries.
        button.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7"></circle>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
            <path d="M12 2v3"></path>
            <path d="M12 19v3"></path>
            <path d="M2 12h3"></path>
            <path d="M19 12h3"></path>
          </svg>
        `

        button.addEventListener('click', handleClick)
        container.appendChild(button)
        return container
      },
      onRemove(mapInstance) {
        // MapLibre removes the container element automatically.
        void mapInstance
      },
    }

    mountedMap = map
    map.addControl(control as any, position)

    return () => {
      if (control && mountedMap) {
        mountedMap.removeControl(control as any)
      }
      control = null
      mountedMap = null
    }
  })
</script>

<style>
  /* Geolocate button base styles */
  :global(.shadcn-map .shadcn-geolocate-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: none !important;
    background-color: transparent !important;
  }

  :global(.shadcn-map .shadcn-geolocate-btn svg) {
    display: block;
  }

  /* Dark mode: override the filter: invert(1) from Map.svelte since we use inline SVG with currentColor.
   * Also explicitly set color so the SVG stroke inherits the light foreground. */
  :global(.dark .shadcn-map .shadcn-geolocate-btn.maplibregl-ctrl-icon) {
    filter: none !important;
    color: var(--map-ui-foreground);
  }
</style>
