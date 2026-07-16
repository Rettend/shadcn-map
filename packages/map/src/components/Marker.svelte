<script lang='ts' module>
  import type { BadgePosition, MarkerBadge, MarkerColor, MarkerIconValue, MarkerSize } from '../types'

  export interface MarkerProps {
    /** Marker position [lng, lat] */
    lngLat: [number, number]
    /** Theme token or UnoCSS color classes */
    color?: MarkerColor | string
    /** Optional text/icon class when using class colors */
    textColor?: string
    /** Size */
    size?: MarkerSize
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
    /** Iconify/UnoCSS class or trusted inline SVG icon */
    icon?: MarkerIconValue
    /** Include marker in auto clustering */
    clusterable?: boolean
    /** Badge(s) at corners. Same-position badges cluster into count. */
    badges?: MarkerBadge[]
    /** Manually mark as active (for DetailsPanel). Auto-detected for Popup. */
    active?: boolean
    /** Ring color class for active state (UnoCSS ring color class, e.g. 'ring-emerald-500/50'). */
    ringColor?: string
  }
</script>

<script lang='ts'>
  import maplibregl from 'maplibre-gl'
  import { onMount } from 'svelte'
  import { getMapContext } from '../context.svelte'
  import { themeColorTokens } from '../theme'
  import { buildBadgeSvgMarkup } from './badge-visual'

  const {
    lngLat,
    color = 'primary',
    size = 'md',
    label,
    draggable = false,
    class: className = '',
    onclick,
    ondragend,
    icon,
    textColor,
    clusterable = true,
    badges = [],
    active = false,
    ringColor,
  }: MarkerProps = $props()

  const ctx = getMapContext()

  let markerElement: HTMLDivElement
  let marker: maplibregl.Marker | null = null
  let lastLngLat: [number, number] | null = null
  let lastClusterable: boolean | null = null

  function createMarkerId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `marker-${Math.random().toString(36).slice(2)}`
  }

  const markerId = createMarkerId()

  const sizes: Record<MarkerSize, { width: number, height: number, iconSize: number, badgeSize: number, badgeIconSize: number, badgeOffset: number }> = {
    sm: { width: 28, height: 28, iconSize: 16, badgeSize: 16, badgeIconSize: 10, badgeOffset: 6 },
    md: { width: 36, height: 36, iconSize: 20, badgeSize: 20, badgeIconSize: 12, badgeOffset: 7 },
    lg: { width: 44, height: 44, iconSize: 24, badgeSize: 24, badgeIconSize: 14, badgeOffset: 8 },
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

  const numberIcons: Record<number, string> = {
    2: 'i-ph:number-two-bold',
    3: 'i-ph:number-three-bold',
    4: 'i-ph:number-four-bold',
    5: 'i-ph:number-five-bold',
    6: 'i-ph:number-six-bold',
    7: 'i-ph:number-seven-bold',
    8: 'i-ph:number-eight-bold',
    9: 'i-ph:number-nine-bold',
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

  // Group badges by position and compute display state
  const badgesByPosition = $derived.by(() => {
    const groups: Record<BadgePosition, MarkerBadge[]> = {
      'top-right': [],
      'top-left': [],
      'bottom-right': [],
      'bottom-left': [],
    }

    for (const badge of badges) {
      const pos = badge.position ?? 'top-right'
      groups[pos].push(badge)
    }

    return groups
  })

  const renderedBadges = $derived.by(() => {
    const result: Array<{
      position: BadgePosition
      icon?: string
      svgBody?: string
      svgWidth?: number
      svgHeight?: number
      color: string
      textColor: string
      label: string
      count: number
    }> = []

    for (const [position, positionBadges] of Object.entries(badgesByPosition) as [BadgePosition, MarkerBadge[]][]) {
      if (positionBadges.length === 0)
        continue

      const firstBadge = positionBadges[0]
      const count = positionBadges.length

      if (count === 1 && firstBadge) {
        // Single badge: show its icon
        result.push({
          position,
          icon: firstBadge.icon,
          svgBody: firstBadge.svgBody,
          svgWidth: firstBadge.svgWidth,
          svgHeight: firstBadge.svgHeight,
          color: firstBadge.color ?? 'bg-zinc-700',
          textColor: firstBadge.textColor ?? 'text-white',
          label: firstBadge.label ?? '',
          count: 1,
        })
      }
      else {
        // Multiple badges: show count icon (max 9)
        const displayCount = Math.min(count, 9)
        const countIcon = numberIcons[displayCount] ?? 'i-ph:number-nine-bold'
        const allLabels = positionBadges
          .map(b => b.label)
          .filter(Boolean)
          .join(', ')

        result.push({
          position,
          icon: countIcon,
          color: firstBadge?.color ?? 'bg-zinc-700',
          textColor: firstBadge?.textColor ?? 'text-white',
          label: count > 9 ? `${allLabels} (+${count - 9} more)` : allLabels,
          count,
        })
      }
    }

    return result
  })

  const expandedBadges = $derived.by(() => {
    const result: Array<{
      key: string
      position: BadgePosition
      icon?: string
      svgBody?: string
      svgWidth?: number
      svgHeight?: number
      color: string
      textColor: string
      label: string
      index: number
      total: number
    }> = []

    for (const [position, positionBadges] of Object.entries(badgesByPosition) as [BadgePosition, MarkerBadge[]][]) {
      if (positionBadges.length <= 1)
        continue

      const allLabels = positionBadges
        .map(b => b.label)
        .filter(Boolean)
        .join(', ')

      for (const [index, badge] of positionBadges.entries()) {
        result.push({
          key: `${position}-${index}`,
          position: position as BadgePosition,
          icon: badge.icon,
          svgBody: badge.svgBody,
          svgWidth: badge.svgWidth,
          svgHeight: badge.svgHeight,
          color: badge.color ?? 'bg-zinc-700',
          textColor: badge.textColor ?? 'text-white',
          label: index === 0 ? allLabels : (badge.label ?? ''),
          index,
          total: positionBadges.length,
        })
      }
    }

    return result
  })

  // Read clusteredVersion to force re-evaluation when clustered state changes
  const isClustered = $derived.by(() => {
    void ctx.clusteredVersion
    return clusterable && ctx.clusteredMarkerIds.has(markerId)
  })

  // Hide tooltips only when a popup is open (not details panel)
  const anyPopupOpen = $derived(ctx.activePopupMarkerId !== null)

  // Active state: auto-detect from popup OR manual prop
  const hasActivePopup = $derived(ctx.activePopupMarkerId === markerId)
  const isActive = $derived(hasActivePopup || active)

  function handleKeydown(event: KeyboardEvent) {
    if (!onclick || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }
    event.preventDefault()
    onclick()
  }

  onMount(() => {
    const map = ctx.map
    if (!map || !markerElement)
      return

    const handleElementClick = (event: MouseEvent) => {
      if (onclick) {
        event.stopPropagation()
        onclick()
      }
    }
    markerElement.addEventListener('click', handleElementClick)

    ctx.registerMarker({ id: markerId, lngLat, clusterable, size })

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
          ctx.updateMarker(markerId, { lngLat: [pos.lng, pos.lat] })
        }
      })
    }

    return () => {
      markerElement.removeEventListener('click', handleElementClick)
      ctx.unregisterMarker(markerId)
      marker?.remove()
      marker = null
    }
  })

  $effect(() => {
    const hasLngLatChange = !lastLngLat || lastLngLat[0] !== lngLat[0] || lastLngLat[1] !== lngLat[1]
    const hasClusterableChange = lastClusterable === null || lastClusterable !== clusterable
    if (hasLngLatChange || hasClusterableChange) {
      ctx.updateMarker(markerId, { lngLat, clusterable, size })
      lastLngLat = [lngLat[0], lngLat[1]]
      lastClusterable = clusterable
    }
  })

  $effect(() => {
    if (marker && lngLat) {
      marker.setLngLat(lngLat)
    }
  })
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={markerElement}
  class='shadcn-marker {size} {className}'
  class:has-label={!!label}
  class:popup-open={anyPopupOpen}
  class:marker-active={isActive}
  data-color-mode={isThemeColor ? 'theme' : 'class'}
  data-map-mode={ctx.resolvedMode}
  style:--marker-color={isThemeColor ? markerColorVar : 'currentColor'}
  style:--marker-text={isThemeColor ? markerTextVar : undefined}
  style:--marker-width='{sizeConfig.width}px'
  style:--marker-height='{sizeConfig.height}px'
  style:--icon-size='{sizeConfig.iconSize}px'
  style:--badge-size='{sizeConfig.badgeSize}px'
  style:--badge-icon-size='{sizeConfig.badgeIconSize}px'
  style:--badge-offset='{sizeConfig.badgeOffset}px'
  style:display={isClustered ? 'none' : undefined}
  onkeydown={handleKeydown}
  role={onclick ? 'button' : undefined}
  tabindex={isClustered ? -1 : (onclick ? 0 : undefined)}
  aria-label={onclick ? (label || 'Map marker') : undefined}
  aria-hidden={isClustered ? 'true' : undefined}
  data-label={label}
>
  <div class='marker-inner {markerColorClass} {markerTextClass} {isActive && ringColor ? `ring-4 ${ringColor}` : ''}' class:active-ring={isActive && ringColor} class:theme-ring={isActive && isThemeColor && !ringColor} class:fallback-ring={isActive && !ringColor && !isThemeColor}>
    {#if typeof icon === 'string'}
      <span class='marker-icon {icon}' aria-hidden='true'></span>
    {:else if icon?.svgBody}
      <span class='marker-icon marker-icon-svg' aria-hidden='true'>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted icon API input. -->
        {@html buildBadgeSvgMarkup(icon.svgBody, icon.svgWidth, icon.svgHeight)}
      </span>
    {:else}
      <div class='marker-dot'></div>
    {/if}
  </div>

  {#each renderedBadges as badge (badge.position)}
    <div
      class='marker-badge {badge.color} {badge.textColor}'
      class:has-expanded={badge.count > 1}
      data-position={badge.position}
      title={badge.label}
    >
      {#if badge.svgBody}
        <span class='badge-icon badge-icon-svg' aria-hidden='true'>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted badge API input. -->
          {@html buildBadgeSvgMarkup(badge.svgBody, badge.svgWidth, badge.svgHeight)}
        </span>
      {:else if badge.icon}
        <span class='badge-icon {badge.icon}' aria-hidden='true'></span>
      {/if}
    </div>
  {/each}

  {#each expandedBadges as badge (badge.key)}
    <div
      class='marker-badge marker-badge-expanded {badge.color} {badge.textColor}'
      data-position={badge.position}
      data-index={badge.index}
      data-total={badge.total}
      title={badge.label}
      style:--badge-index={badge.index}
    >
      {#if badge.svgBody}
        <span class='badge-icon badge-icon-svg' aria-hidden='true'>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted badge API input. -->
          {@html buildBadgeSvgMarkup(badge.svgBody, badge.svgWidth, badge.svgHeight)}
        </span>
      {:else if badge.icon}
        <span class='badge-icon {badge.icon}' aria-hidden='true'></span>
      {/if}
    </div>
  {/each}
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

  .shadcn-marker.marker-active:hover {
    transform: scale(1);
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
    /* Use UnoCSS shadow vars so `ring-*` (also box-shadow) can coexist. */
    --un-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    box-shadow:
      var(--un-ring-shadow, 0 0 #0000),
      var(--un-shadow, 0 0 #0000);
    transition: box-shadow 0.15s ease;
  }

  .shadcn-marker[data-color-mode='theme'] .marker-inner {
    background: oklch(var(--marker-color));
    color: oklch(var(--marker-text));
  }

  .shadcn-marker[data-color-mode='theme'][data-map-mode='dark'] .marker-inner {
    border-color: #3f3f46;
  }

  .shadcn-marker[data-color-mode='theme'][data-map-mode='light'] .marker-inner {
    border-color: #e4e4e7;
  }

  .shadcn-marker[data-color-mode='class'] .marker-inner {
    border-color: rgba(0, 0, 0, 0.25);
  }

  .shadcn-marker[data-color-mode='class'][data-map-mode='dark'] .marker-inner {
    border-color: rgba(255, 255, 255, 0.25);
  }

  .shadcn-marker:hover .marker-inner {
    --un-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  /* Keep active visuals stable: no hover shadow changes (prevents flicker). */
  .shadcn-marker.marker-active:hover .marker-inner {
    --un-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

  .marker-icon-svg {
    width: 1em;
    height: 1em;
    line-height: 0;
  }

  .marker-icon-svg :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Badge styles */
  .marker-badge {
    position: absolute;
    width: var(--badge-size);
    height: var(--badge-size);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    pointer-events: auto;
    cursor: default;
    z-index: 1;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .marker-badge[data-position='top-right'] {
    top: calc(var(--badge-offset) * -1);
    right: calc(var(--badge-offset) * -1);
  }

  .marker-badge[data-position='top-left'] {
    top: calc(var(--badge-offset) * -1);
    left: calc(var(--badge-offset) * -1);
  }

  .marker-badge[data-position='bottom-right'] {
    bottom: calc(var(--badge-offset) * -1);
    right: calc(var(--badge-offset) * -1);
  }

  .marker-badge[data-position='bottom-left'] {
    bottom: calc(var(--badge-offset) * -1);
    left: calc(var(--badge-offset) * -1);
  }

  /* Expanded badges: hidden by default, spread on hover */
  .marker-badge-expanded {
    --badge-spread: calc(var(--badge-size) + 4px);
    opacity: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Spread direction based on position */
  .marker-badge-expanded[data-position='top-right'] {
    transform: translateX(0);
  }

  .marker-badge-expanded[data-position='top-left'] {
    transform: translateX(0);
  }

  .marker-badge-expanded[data-position='bottom-right'] {
    transform: translateX(0);
  }

  .marker-badge-expanded[data-position='bottom-left'] {
    transform: translateX(0);
  }

  /* On hover: show expanded badges with spread */
  .shadcn-marker:hover .marker-badge-expanded {
    opacity: 1;
    pointer-events: auto;
    z-index: 1;
  }

  .shadcn-marker:hover .marker-badge-expanded[data-position='top-right'] {
    transform: translateX(calc(var(--badge-spread) * var(--badge-index)));
  }

  .shadcn-marker:hover .marker-badge-expanded[data-position='top-left'] {
    transform: translateX(calc(var(--badge-spread) * var(--badge-index) * -1));
  }

  .shadcn-marker:hover .marker-badge-expanded[data-position='bottom-right'] {
    transform: translateX(calc(var(--badge-spread) * var(--badge-index)));
  }

  .shadcn-marker:hover .marker-badge-expanded[data-position='bottom-left'] {
    transform: translateX(calc(var(--badge-spread) * var(--badge-index) * -1));
  }

  /* Hide the count badge on hover when there are expanded badges */
  .shadcn-marker:hover .marker-badge.has-expanded {
    opacity: 0;
    pointer-events: none;
  }

  .badge-icon {
    font-size: var(--badge-icon-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .badge-icon-svg {
    width: 1em;
    height: 1em;
    line-height: 0;
  }

  .badge-icon-svg :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .shadcn-marker[data-map-mode='dark'] .marker-badge {
    border-color: rgba(0, 0, 0, 0.3);
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
    z-index: 100;
  }

  .has-label:hover::after {
    opacity: 1;
  }

  .popup-open.has-label::after {
    display: none;
  }

  .marker-active {
    z-index: 10;
  }

  .theme-ring {
    transform: scale(1.15);
    box-shadow:
      0 0 0 4px color-mix(in oklch, oklch(var(--marker-color)) 50%, transparent),
      0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .active-ring {
    transform: scale(1.15);
    --un-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .fallback-ring {
    transform: scale(1.15);
    box-shadow:
      0 0 0 4px rgba(260, 260, 260, 0.9),
      0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .shadcn-marker[data-map-mode='dark'] .fallback-ring {
    box-shadow:
      0 0 0 4px rgba(50, 50, 50, 0.9),
      0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .shadcn-marker[data-map-mode='dark'].has-label::after {
    background: hsl(240 5.9% 90%);
    color: hsl(240 10% 3.9%);
  }
</style>
