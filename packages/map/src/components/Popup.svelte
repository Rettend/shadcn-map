<script lang='ts' module>
  import type { Snippet } from 'svelte'

  export interface PopupProps {
    /** Popup position [lng, lat] */
    lngLat: [number, number]
    /** Whether popup is visible */
    open?: boolean
    /** Close callback */
    onclose?: () => void
    /** Close the popup when the map is clicked */
    closeOnClick?: boolean
    /** Additional CSS classes */
    class?: string
    /** Offset from anchor point (number = uniform, array = [x, y], or 'auto' for auto-detected) */
    offset?: number | [number, number] | 'auto'
    /** Children */
    children?: Snippet
  }
</script>

<script lang='ts'>
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../context.svelte'

  const {
    lngLat,
    open = true,
    onclose,
    closeOnClick = true,
    class: className = '',
    offset = 'auto',
    children,
  }: PopupProps = $props()

  const ctx = getMapContext()

  let popup: maplibregl.Popup | null = null
  let contentElement: HTMLDivElement
  let programmaticClose = false
  let lastActiveMarkerId: string | null = null

  const sizeOffsets: Record<'sm' | 'md' | 'lg', [number, number]> = {
    sm: [0, -12],
    md: [0, -16],
    lg: [0, -20],
  }

  const markerAtLocation = $derived.by(() => {
    for (const marker of ctx.markers.values()) {
      const lngDiff = Math.abs(marker.lngLat[0] - lngLat[0])
      const latDiff = Math.abs(marker.lngLat[1] - lngLat[1])
      if (lngDiff < 0.000001 && latDiff < 0.000001) {
        return marker
      }
    }
    return null
  })

  const detectedMarkerSize = $derived(markerAtLocation?.size ?? 'md')

  const computedOffset = $derived.by((): number | [number, number] => {
    if (offset !== 'auto') {
      return offset
    }
    return sizeOffsets[detectedMarkerSize]
  })

  function handleClose() {
    if (!programmaticClose) {
      ctx.setActivePopupMarker(null)
      onclose?.()
    }
  }

  function closePopup() {
    if (!popup) {
      return
    }
    programmaticClose = true
    popup.remove()
    queueMicrotask(() => {
      programmaticClose = false
    })
  }

  onMount(() => {
    const map = ctx.map
    if (!map || !contentElement) {
      return
    }

    popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick,
      offset: computedOffset,
      anchor: 'bottom',
      className: 'shadcn-map-popup',
    })

    popup.setDOMContent(contentElement)
    popup.setLngLat(lngLat)
    popup.on('close', handleClose)

    if (open) {
      popup.addTo(map)
    }

    return () => {
      // If this popup is being unmounted while open, MapLibre won't necessarily emit a "close"
      // event (we detach the listener before remove). Ensure the marker active state is cleared.
      if (lastActiveMarkerId && ctx.activePopupMarkerId === lastActiveMarkerId) {
        ctx.setActivePopupMarker(null)
      }
      popup?.off('close', handleClose)
      popup?.remove()
      popup = null
    }
  })

  $effect(() => {
    if (popup) {
      popup.setLngLat(lngLat)
    }
  })

  $effect(() => {
    if (popup) {
      popup.setOffset(computedOffset)
    }
  })

  $effect(() => {
    const map = ctx.map
    if (!popup || !map) {
      return
    }

    if (open) {
      if (!popup.isOpen()) {
        popup.addTo(map)
      }
      if (markerAtLocation) {
        ctx.setActivePopupMarker(markerAtLocation.id)
        lastActiveMarkerId = markerAtLocation.id
      }
    }
    else if (popup.isOpen()) {
      closePopup()
    }
  })

  $effect(() => {
    if (!open) {
      if (markerAtLocation && ctx.activePopupMarkerId === markerAtLocation.id) {
        ctx.setActivePopupMarker(null)
      }
    }
  })
</script>

<div bind:this={contentElement} class='shadcn-popup-content {className}'>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .shadcn-popup-content {
    display: grid;
    gap: 6px;
  }

  :global(.shadcn-map-popup) {
    z-index: 20 !important;
  }

  :global(.shadcn-map-popup .maplibregl-popup-content) {
    background: oklch(var(--card));
    color: oklch(var(--card-foreground));
    border: 1px solid oklch(var(--border));
    border-radius: 10px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
    padding: 10px 20px 10px 12px;
    font-size: 13px;
  }

  :global(.shadcn-map-popup .maplibregl-popup-close-button) {
    color: oklch(var(--muted-foreground));
    font-size: 16px;
    padding: 2px 6px;
  }

  :global(.shadcn-map-popup .maplibregl-popup-close-button:hover) {
    background: oklch(var(--muted));
    color: oklch(var(--foreground));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
    border-top-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-top .maplibregl-popup-tip) {
    border-bottom-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-left .maplibregl-popup-tip) {
    border-right-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-right .maplibregl-popup-tip) {
    border-left-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip) {
    border-top-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip) {
    border-top-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-top-left .maplibregl-popup-tip) {
    border-bottom-color: oklch(var(--card));
  }

  :global(.shadcn-map-popup.maplibregl-popup-anchor-top-right .maplibregl-popup-tip) {
    border-bottom-color: oklch(var(--card));
  }
</style>
