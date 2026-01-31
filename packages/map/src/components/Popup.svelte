<script lang='ts' module>
  import type { Snippet } from 'svelte'

  export interface PopupProps {
    /** Popup position [lng, lat] */
    lngLat: [number, number]
    /** Whether popup is visible */
    open?: boolean
    /** Close callback */
    onclose?: () => void
    /** Additional CSS classes */
    class?: string
    /** Offset from anchor point */
    offset?: number | [number, number]
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
    class: className = '',
    offset = 8,
    children,
  }: PopupProps = $props()

  const ctx = getMapContext()

  let popup: maplibregl.Popup | null = null
  let contentElement: HTMLDivElement
  let programmaticClose = false

  function handleClose() {
    if (!programmaticClose) {
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
      closeOnClick: true,
      offset,
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
      popup.setOffset(offset)
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
    }
    else if (popup.isOpen()) {
      closePopup()
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

  :global(.shadcn-map-popup .maplibregl-popup-content) {
    background: oklch(var(--card));
    color: oklch(var(--card-foreground));
    border: 1px solid oklch(var(--border));
    border-radius: 10px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
    padding: 10px 12px;
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
