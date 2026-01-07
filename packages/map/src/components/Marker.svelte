<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { MarkerProps, MarkerSize } from '../types'
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { getMapContext } from '../context'
  import { colors } from '../styles/colors'

  const {
    lngLat,
    variant = 'default',
    size = 'md',
    pulse = false,
    label,
    draggable = false,
    class: className = '',
    onclick,
    ondragend,
    icon,
  }: MarkerProps & { icon?: Snippet } = $props()

  // Get context stores - safe to call during init
  const ctx = getMapContext()

  let markerElement: HTMLDivElement
  let marker: maplibregl.Marker | null = null

  // Size mappings
  const sizes: Record<MarkerSize, { width: number, height: number, iconSize: number }> = {
    sm: { width: 24, height: 24, iconSize: 12 },
    md: { width: 32, height: 32, iconSize: 16 },
    lg: { width: 44, height: 44, iconSize: 20 },
  }

  // Get variant colors
  const variantColors = $derived(colors.marker[variant])
  const sizeConfig = $derived(sizes[size])

  onMount(() => {
    // Get map from store
    const map = get(ctx.map)
    if (!map || !markerElement)
      return

    // Create marker
    marker = new maplibregl.Marker({
      element: markerElement,
      draggable,
      anchor: 'center',
    })
      .setLngLat(lngLat)
      .addTo(map)

    // Handle drag end
    if (draggable) {
      marker.on('dragend', () => {
        const pos = marker?.getLngLat()
        if (pos) {
          ondragend?.([pos.lng, pos.lat])
        }
      })
    }

    return () => {
      marker?.remove()
      marker = null
    }
  })

  // Update position when lngLat changes
  $effect(() => {
    if (marker && lngLat) {
      marker.setLngLat(lngLat)
    }
  })
</script>

<div
  bind:this={markerElement}
  class='shadcn-marker {variant} {size} {className}'
  class:pulse
  class:has-label={!!label}
  style:--marker-bg={variantColors.bg}
  style:--marker-border={variantColors.border}
  style:--marker-text={variantColors.text}
  style:--marker-width='{sizeConfig.width}px'
  style:--marker-height='{sizeConfig.height}px'
  style:--icon-size='{sizeConfig.iconSize}px'
  onclick={() => onclick?.()}
  onkeydown={e => e.key === 'Enter' && onclick?.()}
  role='button'
  tabindex='0'
  aria-label={label || 'Map marker'}
  data-label={label}
>
  <div class='marker-inner'>
    {#if icon}
      <div class='marker-icon'>
        {@render icon()}
      </div>
    {:else}
      <div class='marker-dot'></div>
    {/if}
  </div>
</div>

<style>
  .shadcn-marker {
    width: var(--marker-width);
    height: var(--marker-height);
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .shadcn-marker:hover {
    transform: scale(1.1);
  }

  .shadcn-marker:focus-visible {
    outline: 2px solid var(--marker-bg);
    outline-offset: 2px;
  }

  .marker-inner {
    width: 100%;
    height: 100%;
    background: var(--marker-bg);
    border: 2px solid var(--marker-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: box-shadow 0.15s ease;
  }

  .shadcn-marker:hover .marker-inner {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .marker-dot {
    width: 6px;
    height: 6px;
    background: var(--marker-text);
    border-radius: 50%;
  }

  .marker-icon {
    font-size: var(--icon-size);
    color: var(--marker-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Pulse animation for selected/active state */
  .pulse .marker-inner {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--marker-bg) 50%, transparent);
    }
    50% {
      box-shadow: 0 0 0 10px transparent;
    }
  }

  /* Label on hover */
  .has-label::after {
    content: attr(data-label);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: hsl(240 10% 3.9%);
    color: hsl(0 0% 98%);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 10;
  }

  .has-label:hover::after {
    opacity: 1;
  }

  /* Dark mode label adjustment */
  :global(.dark) .has-label::after {
    background: hsl(240 5.9% 90%);
    color: hsl(240 10% 3.9%);
  }
</style>
