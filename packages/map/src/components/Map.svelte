<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { MapProps, StyleMode } from '../types'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'
  import { onMount } from 'svelte'
  import { createMapContext } from '../context'
  import { createDarkStyle } from '../styles/dark'
  import { createLightStyle } from '../styles/light'
  import 'maplibre-gl/dist/maplibre-gl.css'

  const {
    center = [0, 0],
    zoom = 10,
    minZoom = 0,
    maxZoom = 20,
    pitch = 0,
    bearing = 0,
    style = 'auto',
    tiles,
    interactive = true,
    class: className = '',
    onload,
    onclick,
    onmove,
    onzoom: onzoomCallback,
    children,
  }: MapProps & { children?: Snippet } = $props()

  let container: HTMLDivElement

  // Detect dark mode from mode-watcher
  function getIsDarkMode(): boolean {
    if (typeof document === 'undefined')
      return true
    return document.documentElement.classList.contains('dark')
  }

  // Get the appropriate style based on mode
  function getStyle() {
    if (typeof style === 'object') {
      return style
    }

    const mode: StyleMode = style === 'auto' ? (getIsDarkMode() ? 'dark' : 'light') : style

    return mode === 'dark' ? createDarkStyle(tiles) : createLightStyle(tiles)
  }

  // Create context with stores - children can subscribe to these
  const ctx = createMapContext()

  // Track loaded state locally for template
  let loaded = $state(false)

  onMount(() => {
    // Register PMTiles protocol
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    // Create map instance
    const mapInstance = new maplibregl.Map({
      container,
      style: getStyle(),
      center,
      zoom,
      minZoom,
      maxZoom,
      pitch,
      bearing,
      interactive,
    })

    // Update the context store
    ctx.map.set(mapInstance)

    // Event handlers
    mapInstance.on('load', () => {
      loaded = true
      ctx.loaded.set(true)
      onload?.(mapInstance)
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

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      mapInstance.setStyle(getStyle())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
      maplibregl.removeProtocol('pmtiles')
      ctx.map.set(null)
      ctx.loaded.set(false)
      mapInstance.remove()
    }
  })
</script>

<div bind:this={container} class='shadcn-map {className}'>
  {#if loaded && children}
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

  /* Style the attribution */
  .shadcn-map :global(.maplibregl-ctrl-attrib) {
    font-size: 10px;
    background: transparent;
    opacity: 0.5;
  }

  .shadcn-map :global(.maplibregl-ctrl-attrib a) {
    color: inherit;
  }
</style>
