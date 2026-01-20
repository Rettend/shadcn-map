<script lang='ts' module>
  import type { MarkerColor, MarkerSize } from '../types'

  export interface MarkerProps {
    /** Marker position [lng, lat] */
    lngLat: [number, number]
    /** Theme token or UnoCSS color classes */
    color?: MarkerColor | string
    /** Optional text/icon class when using class colors */
    textColor?: string
    /** Size */
    size?: MarkerSize
    /** Show pulse animation */
    pulse?: boolean
    /** Label shown on hover */
    label?: string
    /** Allow dragging */
    draggable?: boolean
    /** Additional CSS classes */
    class?: string
    /** Click callback */
    onclick?: () => void
    /** Drag end callback */
    ondragend?: (lngLat: [number, number]) => void
    /** Icon class (Iconify/UnoCSS) */
    icon?: string
  }
</script>

<script lang='ts'>
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../context.svelte'
  import { themeColorTokens } from '../theme'

  const {
    lngLat,
    color = 'primary',
    size = 'md',
    pulse = false,
    label,
    draggable = false,
    class: className = '',
    onclick,
    ondragend,
    icon,
    textColor,
  }: MarkerProps = $props()

  const ctx = getMapContext()

  let markerElement: HTMLDivElement
  let marker: maplibregl.Marker | null = null

  const sizes: Record<MarkerSize, { width: number, height: number, iconSize: number }> = {
    sm: { width: 24, height: 24, iconSize: 12 },
    md: { width: 32, height: 32, iconSize: 16 },
    lg: { width: 44, height: 44, iconSize: 20 },
  }

  const colorForegroundMap: Partial<Record<MarkerColor, MarkerColor>> = {
    'background': 'foreground',
    'foreground': 'background',
    'card': 'card-foreground',
    'card-foreground': 'card',
    'popover': 'popover-foreground',
    'popover-foreground': 'popover',
    'primary': 'primary-foreground',
    'primary-foreground': 'primary',
    'secondary': 'secondary-foreground',
    'secondary-foreground': 'secondary',
    'muted': 'muted-foreground',
    'muted-foreground': 'muted',
    'accent': 'accent-foreground',
    'accent-foreground': 'accent',
    'destructive': 'destructive-foreground',
    'destructive-foreground': 'destructive',
    'sidebar': 'sidebar-foreground',
    'sidebar-foreground': 'sidebar',
    'sidebar-primary': 'sidebar-primary-foreground',
    'sidebar-primary-foreground': 'sidebar-primary',
    'sidebar-accent': 'sidebar-accent-foreground',
    'sidebar-accent-foreground': 'sidebar-accent',
  }

  const isThemeColor = $derived(themeColorTokens.includes(color as MarkerColor))
  const resolvedThemeColor = $derived(isThemeColor ? (color as MarkerColor) : 'primary')
  const markerColorVar = $derived(`var(--${resolvedThemeColor})`)
  const markerTextVar = $derived(`var(--${colorForegroundMap[resolvedThemeColor] ?? 'foreground'})`)
  const markerColorClass = $derived(isThemeColor ? '' : (color || ''))
  const hasTextClass = $derived(!isThemeColor && /\btext-/.test(String(color)))
  const markerTextClass = $derived(
    !isThemeColor
      ? (textColor ?? (hasTextClass ? '' : 'text-white'))
      : '',
  )
  const sizeConfig = $derived(sizes[size])

  onMount(() => {
    const map = ctx.map
    if (!map || !markerElement)
      return

    marker = new maplibregl.Marker({
      element: markerElement,
      draggable,
      anchor: 'center',
    })
      .setLngLat(lngLat)
      .addTo(map)

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

  $effect(() => {
    if (marker && lngLat) {
      marker.setLngLat(lngLat)
    }
  })
</script>

<div
  bind:this={markerElement}
  class='shadcn-marker {size} {className}'
  class:pulse
  class:has-label={!!label}
  data-color-mode={isThemeColor ? 'theme' : 'class'}
  style:--marker-color={isThemeColor ? markerColorVar : 'currentColor'}
  style:--marker-text={isThemeColor ? markerTextVar : undefined}
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
  <div class='marker-inner {markerColorClass} {markerTextClass}'>
    {#if icon}
      <span class='marker-icon {icon}' aria-hidden='true'></span>
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
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .shadcn-marker:hover {
    transform: scale(1.1);
  }

  .shadcn-marker:focus-visible {
    outline: 2px solid oklch(var(--marker-color));
    outline-offset: 2px;
  }

  .marker-inner {
    width: 100%;
    height: 100%;
    border: 2px solid transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: box-shadow 0.15s ease;
  }

  .shadcn-marker[data-color-mode='theme'] .marker-inner {
    background: oklch(var(--marker-color));
    color: oklch(var(--marker-text));
    border-color: oklch(var(--border));
  }

  .shadcn-marker[data-color-mode='class'] .marker-inner {
    border-color: rgba(0, 0, 0, 0.25);
  }

  :global(.dark) .shadcn-marker[data-color-mode='class'] .marker-inner {
    border-color: rgba(255, 255, 255, 0.25);
  }

  .shadcn-marker:hover .marker-inner {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .marker-dot {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
  }

  .marker-icon {
    font-size: var(--icon-size);
    color: currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse .marker-inner {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 color-mix(in oklch, oklch(var(--marker-color)) 50%, transparent);
    }
    50% {
      box-shadow: 0 0 0 10px transparent;
    }
  }

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

  :global(.dark) .has-label::after {
    background: hsl(240 5.9% 90%);
    color: hsl(240 10% 3.9%);
  }
</style>
