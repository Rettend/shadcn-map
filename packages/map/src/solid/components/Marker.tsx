import type { JSX } from '@solidjs/web'
import type { MarkerBadge, MarkerColor, MarkerIconValue, MarkerSize } from '../../shared/types'
import { Marker as MapLibreMarker } from 'maplibre-gl'
import { createEffect, createMemo, createSignal, For, onSettled } from 'solid-js'
import { buildBadgeSvgMarkup, resolveMarkerBadgeLayout } from '../../shared/badge-visual'
import { themeColorTokens } from '../../shared/theme'
import { getMapContext } from '../context'

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

const sizes: Record<
  MarkerSize,
  {
    width: number
    height: number
    iconSize: number
    badgeSize: number
    badgeIconSize: number
    badgeOffset: number
  }
> = {
  sm: { width: 28, height: 28, iconSize: 16, badgeSize: 16, badgeIconSize: 10, badgeOffset: 6 },
  md: { width: 36, height: 36, iconSize: 20, badgeSize: 20, badgeIconSize: 12, badgeOffset: 7 },
  lg: { width: 44, height: 44, iconSize: 24, badgeSize: 24, badgeIconSize: 14, badgeOffset: 8 },
}

const colorForegroundMap: Partial<Record<MarkerColor, MarkerColor>> = {
  background: 'foreground',
  foreground: 'background',
  card: 'card-foreground',
  'card-foreground': 'card',
  popover: 'popover-foreground',
  'popover-foreground': 'popover',
  primary: 'primary-foreground',
  'primary-foreground': 'primary',
  secondary: 'secondary-foreground',
  'secondary-foreground': 'secondary',
  muted: 'muted-foreground',
  'muted-foreground': 'muted',
  accent: 'accent-foreground',
  'accent-foreground': 'accent',
  destructive: 'destructive-foreground',
  'destructive-foreground': 'destructive',
  sidebar: 'sidebar-foreground',
  'sidebar-foreground': 'sidebar',
  'sidebar-primary': 'sidebar-primary-foreground',
  'sidebar-primary-foreground': 'sidebar-primary',
  'sidebar-accent': 'sidebar-accent-foreground',
  'sidebar-accent-foreground': 'sidebar-accent',
}

function createMarkerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `marker-${Math.random().toString(36).slice(2)}`
}

export function Marker(props: MarkerProps): JSX.Element {
  const ctx = getMapContext()
  const markerId = createMarkerId()
  let markerElement: HTMLDivElement | undefined
  let marker: MapLibreMarker | null = null

  const isThemeColor = createMemo(() =>
    themeColorTokens.includes((props.color ?? 'primary') as MarkerColor),
  )
  const resolvedThemeColor = createMemo<MarkerColor>(() =>
    isThemeColor() ? ((props.color ?? 'primary') as MarkerColor) : 'primary',
  )
  const markerColorVar = createMemo(() => `var(--${resolvedThemeColor()})`)
  const markerTextVar = createMemo(
    () => `var(--${colorForegroundMap[resolvedThemeColor()] ?? 'foreground'})`,
  )
  const markerColorClass = createMemo(() => (isThemeColor() ? '' : (props.color ?? '')))
  const markerTextClass = createMemo(() => {
    if (isThemeColor()) {
      return ''
    }
    return props.textColor ?? (/\btext-/.test(String(props.color ?? 'primary')) ? '' : 'text-white')
  })
  const sizeConfig = createMemo(() => sizes[props.size ?? 'md'])
  const badgeLayout = createMemo(() => resolveMarkerBadgeLayout(props.badges ?? []))
  const renderedBadges = createMemo(() => badgeLayout().collapsed)
  const expandedBadges = createMemo(() => badgeLayout().expanded)
  const isClustered = createMemo(() => {
    void ctx.clusteredVersion
    return (props.clusterable ?? true) && ctx.clusteredMarkerIds.has(markerId)
  })
  const anyPopupOpen = createMemo(() => ctx.activePopupMarkerId !== null)
  const hasActivePopup = createMemo(() => ctx.activePopupMarkerId === markerId)
  const isActive = createMemo(() => hasActivePopup() || (props.active ?? false))
  const [position, setPosition] = createSignal((): [number, number] => [
    props.lngLat[0],
    props.lngLat[1],
  ])
  const registration = createMemo(() => ({
    id: markerId,
    lngLat: position(),
    clusterable: props.clusterable ?? true,
    size: props.size ?? 'md',
  }))

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.onclick || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }
    event.preventDefault()
    props.onclick()
  }

  onSettled(() => {
    const map = ctx.map
    if (!map || !markerElement) {
      return
    }
    const element = markerElement
    const initialRegistration = registration()

    const handleElementClick = (event: MouseEvent) => {
      // Active/popup markers may have no callback, but are not map background.
      event.stopPropagation()
      props.onclick?.()
    }
    element.addEventListener('click', handleElementClick)

    ctx.registerMarker(registration)

    const mountedMarker = new MapLibreMarker({
      element,
      draggable: props.draggable ?? false,
      anchor: 'center',
    })
      .setLngLat(initialRegistration.lngLat)
      .addTo(map)
    marker = mountedMarker

    const handleDragEnd = () => {
      const position = mountedMarker.getLngLat()
      props.ondragend?.([position.lng, position.lat])
      setPosition([position.lng, position.lat])
    }
    mountedMarker.on('dragend', handleDragEnd)

    return () => {
      element.removeEventListener('click', handleElementClick)
      mountedMarker.off('dragend', handleDragEnd)
      ctx.unregisterMarker(markerId)
      mountedMarker.remove()
      marker = null
    }
  })

  createEffect(position, lngLat => {
    marker?.setLngLat(lngLat)
  })

  createEffect(
    () => props.draggable ?? false,
    draggable => {
      marker?.setDraggable(draggable)
    },
  )

  return (
    <div
      ref={element => (markerElement = element)}
      class={[
        'shadcn-marker',
        props.size ?? 'md',
        props.class,
        {
          'has-label': !!props.label,
          'popup-open': anyPopupOpen(),
          'marker-active': isActive(),
        },
      ]}
      data-color-mode={isThemeColor() ? 'theme' : 'class'}
      data-map-mode={ctx.resolvedMode}
      style={{
        '--marker-color': isThemeColor() ? markerColorVar() : 'currentColor',
        '--marker-text': isThemeColor() ? markerTextVar() : undefined,
        '--marker-width': `${sizeConfig().width}px`,
        '--marker-height': `${sizeConfig().height}px`,
        '--icon-size': `${sizeConfig().iconSize}px`,
        '--badge-size': `${sizeConfig().badgeSize}px`,
        '--badge-icon-size': `${sizeConfig().badgeIconSize}px`,
        '--badge-offset': `${sizeConfig().badgeOffset}px`,
        display: isClustered() ? 'none' : undefined,
      }}
      onKeyDown={handleKeyDown}
      role={props.onclick ? 'button' : undefined}
      tabindex={isClustered() ? -1 : props.onclick ? 0 : undefined}
      aria-label={props.onclick ? props.label || 'Map marker' : undefined}
      aria-hidden={isClustered() ? 'true' : undefined}
      data-label={props.label}
    >
      <div
        class={[
          'marker-inner',
          markerColorClass(),
          markerTextClass(),
          isActive() && props.ringColor ? ['ring-4', props.ringColor] : undefined,
          {
            'active-ring': isActive() && !!props.ringColor,
            'theme-ring': isActive() && isThemeColor() && !props.ringColor,
            'fallback-ring': isActive() && !props.ringColor && !isThemeColor(),
          },
        ]}
      >
        {typeof props.icon === 'string' ? (
          <span class={['marker-icon', props.icon]} aria-hidden="true" />
        ) : props.icon?.svgBody ? (
          <span
            class={['marker-icon', 'marker-icon-svg']}
            aria-hidden="true"
            innerHTML={buildBadgeSvgMarkup(
              props.icon.svgBody,
              props.icon.svgWidth,
              props.icon.svgHeight,
            )}
          />
        ) : (
          <div class="marker-dot" />
        )}
      </div>

      <For each={renderedBadges()}>
        {badge => (
          <div
            class={[
              'marker-badge',
              badge.color,
              badge.textColor,
              { 'has-expanded': badge.count > 1 },
            ]}
            data-position={badge.position}
            title={badge.label}
          >
            {badge.svgBody ? (
              <span
                class={['badge-icon', 'badge-icon-svg']}
                aria-hidden="true"
                innerHTML={buildBadgeSvgMarkup(badge.svgBody, badge.svgWidth, badge.svgHeight)}
              />
            ) : badge.icon ? (
              <span class={['badge-icon', badge.icon]} aria-hidden="true" />
            ) : undefined}
          </div>
        )}
      </For>

      <For each={expandedBadges()}>
        {badge => (
          <div
            class={['marker-badge', 'marker-badge-expanded', badge.color, badge.textColor]}
            data-position={badge.position}
            data-index={badge.index}
            data-total={badge.total}
            title={badge.label}
            style={{ '--badge-index': badge.index }}
          >
            {badge.svgBody ? (
              <span
                class={['badge-icon', 'badge-icon-svg']}
                aria-hidden="true"
                innerHTML={buildBadgeSvgMarkup(badge.svgBody, badge.svgWidth, badge.svgHeight)}
              />
            ) : badge.icon ? (
              <span class={['badge-icon', badge.icon]} aria-hidden="true" />
            ) : undefined}
          </div>
        )}
      </For>
    </div>
  )
}
