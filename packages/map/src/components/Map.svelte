<script lang='ts' module>
  import type { Snippet } from 'svelte'
  import type { LabelMode, MapLibreMap, StyleMode, StyleSpecification } from '../types'

  export interface MapProps {
    /** Initial center coordinates [lng, lat] */
    center?: [number, number]
    /** Initial zoom level (0-20) */
    zoom?: number
    /** Minimum zoom allowed */
    minZoom?: number
    /** Maximum zoom allowed */
    maxZoom?: number
    /** Camera pitch (3D tilt) in degrees */
    pitch?: number
    /** Camera rotation in degrees */
    bearing?: number
    /** Map style: 'auto' uses mode-watcher, or specify 'dark'/'light'/custom StyleSpec */
    style?: StyleMode | StyleSpecification
    /** Built-in label density preset (only applies to built-in dark/light/auto styles) */
    labels?: LabelMode
    /** URL to PMTiles file (required) */
    tiles: string
    /** Enable map interactions (pan, zoom) */
    interactive?: boolean
    /** Allow rotation with mouse drag */
    dragRotate?: boolean
    /** Allow pitch (tilt) gestures on touch */
    touchPitch?: boolean
    /** Allow pinch zoom + rotate on touch */
    touchZoomRotate?: boolean
    /** Allow pitch while drag-rotating with mouse */
    pitchWithRotate?: boolean
    /** Additional CSS classes */
    class?: string
    /** Callback when map is fully loaded */
    onload?: (map: MapLibreMap) => void
    /** Callback when map is clicked */
    onclick?: (e: { lngLat: [number, number], point: { x: number, y: number } }) => void
    /** Callback when camera moves */
    onmove?: (e: { center: [number, number], zoom: number }) => void
    /** Callback when zoom changes */
    onzoom?: (zoom: number) => void
    /** Children */
    children?: Snippet
    /** Automatically cluster registered markers */
    autoCluster?: boolean
    /** Cluster radius in pixels for auto clustering */
    autoClusterRadius?: number
    /** Max zoom to cluster at for auto clustering */
    autoClusterMaxZoom?: number
  }
</script>

<script lang='ts'>
  import maplibregl from 'maplibre-gl'
  import { FetchSource, PMTiles, Protocol } from 'pmtiles'
  import { onMount } from 'svelte'
  import { createMapContext } from '../context.svelte'
  import { createDarkStyle } from '../styles/dark'
  import { createLightStyle } from '../styles/light'
  import ClusterLayer from './ClusterLayer.svelte'
  import 'maplibre-gl/dist/maplibre-gl.css'

  const {
    center = [0, 0],
    zoom = 10,
    minZoom = 0,
    maxZoom = 20,
    pitch = 0,
    bearing = 0,
    style = 'auto',
    labels = 'minimal',
    tiles,
    interactive = true,
    dragRotate = true,
    touchPitch = true,
    touchZoomRotate = true,
    pitchWithRotate = true,
    class: className = '',
    onload,
    onclick,
    onmove,
    onzoom: onzoomCallback,
    children,
    autoCluster = false,
    autoClusterRadius = 50,
    autoClusterMaxZoom = 14,
  }: MapProps = $props()

  let container: HTMLDivElement

  function getIsDarkMode(): boolean {
    if (typeof document === 'undefined')
      return true
    return document.documentElement.classList.contains('dark')
  }

  // Track document dark mode for auto style
  let documentIsDark = $state(getIsDarkMode())

  // Resolved mode: for explicit 'dark'/'light' use that, for 'auto' follow document, for custom objects default to 'dark'
  const resolvedMode = $derived.by((): 'dark' | 'light' => {
    if (typeof style === 'object') {
      return 'dark' // Custom style objects default to dark for UI
    }
    if (style === 'auto') {
      return documentIsDark ? 'dark' : 'light'
    }
    return style // 'dark' or 'light'
  })

  function getStyle() {
    if (typeof style === 'object') {
      return style
    }

    return resolvedMode === 'dark' ? createDarkStyle(tiles, { labels }) : createLightStyle(tiles, { labels })
  }

  const ctx = createMapContext()

  // Keep context in sync with resolved mode
  $effect(() => {
    ctx.setResolvedMode(resolvedMode)
  })
  const autoClusterPoints = $derived(
    autoCluster
      ? Array.from(ctx.markers.values())
        .filter(marker => marker.clusterable)
        .map(marker => ({
          id: marker.id,
          lngLat: marker.lngLat,
        }))
      : [],
  )

  function handleAutoClusterUnclustered(unclusteredIds: Set<string>) {
    const clusteredIds = new Set(
      autoClusterPoints
        .map(point => String(point.id))
        .filter(id => !unclusteredIds.has(id)),
    )
    ctx.setClusteredMarkers(clusteredIds)
  }

  let loaded = $state(false)
  let mapError = $state<string | null>(null)

  function checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl2'))
    } catch {
      return false
    }
  }

  $effect(() => {
    if (!autoCluster) {
      ctx.setClusteredMarkers(new Set())
    }
  })

  onMount(() => {
    // Check WebGL before attempting to create the map
    if (!checkWebGL()) {
      mapError = 'WebGL is not available in this browser. The map requires WebGL to render.'
      console.error('[shadcn-map]', mapError)
      return
    }

    const protocol = new Protocol()
    const source = new FetchSource(tiles)
    const sourceWithCacheFlags = source as FetchSource & {
      chromeWindowsNoCache?: boolean
    }
    sourceWithCacheFlags.chromeWindowsNoCache = true
    protocol.add(new PMTiles(source))
    maplibregl.addProtocol('pmtiles', protocol.tile)

    let mapInstance: maplibregl.Map
    try {
      mapInstance = new maplibregl.Map({
        container,
        style: getStyle(),
        center,
        zoom,
        minZoom,
        maxZoom,
        pitch,
        bearing,
        interactive,
        dragRotate,
        touchPitch,
        touchZoomRotate,
        pitchWithRotate,
        fadeDuration: 0,
      })
    } catch (e) {
      mapError = `Map initialization failed: ${e instanceof Error ? e.message : e}`
      console.error('[shadcn-map]', mapError)
      return
    }

    ctx.setMap(mapInstance)

    mapInstance.on('load', () => {
      loaded = true
      ctx.setLoaded(true)
      onload?.(mapInstance)
    })

    mapInstance.on('error', (e) => {
      console.error('[shadcn-map] Map error:', e.error?.message || e)
    })

    mapInstance.on('click', (e) => {
      onclick?.({
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        point: { x: e.point.x, y: e.point.y },
      })
    })

    mapInstance.on('move', () => {
      const center = mapInstance.getCenter()
      onmove?.({
        center: [center.lng, center.lat],
        zoom: mapInstance.getZoom(),
      })
    })

    mapInstance.on('zoom', () => {
      onzoomCallback?.(mapInstance.getZoom())
    })

    // Only observe document dark class changes when style='auto'
    let observer: MutationObserver | null = null
    if (style === 'auto') {
      observer = new MutationObserver(() => {
        documentIsDark = getIsDarkMode()
        mapInstance.setStyle(getStyle())
      })

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }

    return () => {
      observer?.disconnect()
      maplibregl.removeProtocol('pmtiles')
      ctx.setMap(null)
      ctx.setLoaded(false)
      mapInstance.remove()
    }
  })
</script>

<div bind:this={container} class='shadcn-map {className}' data-map-mode={resolvedMode}>
  {#if mapError}
    <div class='shadcn-map-error'>
      <div class='shadcn-map-error-content'>
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
        <p>{mapError}</p>
      </div>
    </div>
  {/if}
  {#if loaded && children}
    {#if autoCluster}
      <ClusterLayer
        points={autoClusterPoints}
        clusterRadius={autoClusterRadius}
        clusterMaxZoom={autoClusterMaxZoom}
        showUnclustered={false}
        onunclusteredchange={handleAutoClusterUnclustered}
      />
    {/if}
    {@render children()}
  {/if}
</div>

<style>
  .shadcn-map {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .shadcn-map :global(.maplibregl-canvas) {
    outline: none;
  }

  .shadcn-map-error {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #18181b;
    color: #a1a1aa;
  }

  .shadcn-map-error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
    font-size: 14px;
    max-width: 320px;
  }

  /* Attribution control */
  .shadcn-map :global(.maplibregl-ctrl-attrib) {
    font-size: 10px;
    background: transparent;
    user-select: none;
  }

  .shadcn-map :global(.maplibregl-ctrl-attrib a) {
    color: inherit;
  }

  /* Fix compact attribution layout */
  .shadcn-map :global(.maplibregl-ctrl-attrib.maplibregl-compact) {
    padding: 0;
    min-height: 24px;
    min-width: 24px;
    line-height: 24px;
  }

  .shadcn-map :global(.maplibregl-ctrl-attrib.maplibregl-compact-show) {
    padding: 0 28px 0 4px;
    min-height: 24px;
    line-height: 24px;
  }

  /* Scale control - transparent bg, themed colors */
  .shadcn-map :global(.maplibregl-ctrl-scale) {
    background-color: transparent;
    border: none;
    border-bottom: 2px solid #333;
    border-left: 2px solid #333;
    border-right: 2px solid #333;
    color: #333;
    line-height: 1.2;
    padding: 0 4px;
    font-size: 10px;
    box-shadow: none;
  }

  /* Dark mode theme variables - hardcoded dark colors that don't depend on mode switcher */
  .shadcn-map[data-map-mode='dark'] {
    --map-ui-surface: #27272a;
    --map-ui-foreground: #f4f4f5;
    --map-ui-border: #3f3f46;
  }

  /* Light mode theme variables - hardcoded light colors */
  .shadcn-map[data-map-mode='light'] {
    --map-ui-surface: #ffffff;
    --map-ui-foreground: #18181b;
    --map-ui-border: #e4e4e7;
  }

  /* Navigation control group - dark mode */
  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-group) {
    background-color: var(--map-ui-surface);
    border: 1px solid var(--map-ui-border);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  }

  /* Navigation control group - light mode */
  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-group) {
    background-color: var(--map-ui-surface);
    border: 1px solid var(--map-ui-border);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-group button) {
    background-color: var(--map-ui-surface);
    color: var(--map-ui-foreground);
  }

  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-group button) {
    background-color: var(--map-ui-surface);
    color: var(--map-ui-foreground);
  }

  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-group button + button) {
    border-top-color: var(--map-ui-border);
  }

  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-group button + button) {
    border-top-color: var(--map-ui-border);
  }

  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-icon) {
    filter: invert(1);
  }

  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-compass .maplibregl-ctrl-icon) {
    filter: invert(1) brightness(1.8) contrast(1.3) drop-shadow(0 0 1px rgba(0, 0, 0, 0.6));
  }

  /* Scale control - dark mode */
  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-scale) {
    color: var(--map-ui-foreground);
    border-color: var(--map-ui-foreground);
  }

  /* Scale control - light mode */
  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-scale) {
    color: var(--map-ui-foreground);
    border-color: var(--map-ui-foreground);
  }

  /* Attribution text panel - dark mode */
  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-attrib) {
    color: var(--map-ui-foreground);
  }

  /* Attribution text panel - light mode */
  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-attrib) {
    color: var(--map-ui-foreground);
  }

  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-attrib.maplibregl-compact-show) {
    background-color: var(--map-ui-surface);
    border-radius: 4px;
  }

  .shadcn-map[data-map-mode='light'] :global(.maplibregl-ctrl-attrib.maplibregl-compact-show) {
    background-color: var(--map-ui-surface);
    border-radius: 4px;
  }

  /* Attribution button - invert icon in dark mode */
  .shadcn-map[data-map-mode='dark'] :global(.maplibregl-ctrl-attrib-button) {
    filter: invert(1);
  }
</style>
