import type { JSX } from '@solidjs/web'
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { FilterSpecification } from 'maplibre-gl'
import type { CompositeMarkerImage } from '../../shared/marker-layer-image'
import type {
  GeoJSONSource,
  MapLayerMouseEvent,
  MapLibreMap,
  MarkerBadge,
  MarkerSize,
} from '../../shared/types'
import { createEffect, createSignal, deep, onSettled, Show } from 'solid-js'
import {
  createCompositeMarkerImage,
  createDefaultMarkerImage,
  getMarkerBadgeHitCircles,
  markerVisualSizes,
} from '../../shared/marker-layer-image'
import { getMapContext } from '../context'

export type MarkerLayerIcon = import('../../shared/marker-layer-image').MarkerLayerIcon
export type MarkerLayerIconValue = import('../../shared/marker-layer-image').MarkerLayerIconValue

export interface MarkerLayerPoint {
  /** Stable unique identifier used for updates and interactions. */
  id: string | number
  /** Marker position [lng, lat]. */
  lngLat: [number, number]
  /** Label returned with interaction events. */
  label?: string
  /** Concrete CSS color understood by MapLibre, such as '#2563eb'. */
  color?: string
  /** Per-point size override. */
  size?: MarkerSize
  /** Per-point Iconify/UnoCSS class or trusted inline SVG icon override. */
  icon?: MarkerLayerIconValue
  /** Per-point icon color override. */
  iconColor?: string
  /** Per-point marker badges. Same-position badges collapse into a count and expand on hover. */
  badges?: MarkerBadge[]
  /** Additional serializable properties copied to the GeoJSON feature. */
  properties?: Record<string, unknown>
}

export interface MarkerLayerProps {
  /** All markers rendered by this layer. */
  points: MarkerLayerPoint[]
  /** Fallback marker color. */
  color?: string
  /** Fallback marker size. */
  size?: MarkerSize
  /** Fallback Iconify/UnoCSS class or trusted inline SVG icon. */
  icon?: MarkerLayerIconValue
  /** Fallback icon color. */
  iconColor?: string
  /** Fallback marker badges. */
  badges?: MarkerBadge[]
  /** Marker border color. Defaults to a map-mode-aware translucent color. */
  strokeColor?: string
  /** Marker shown with an active ring. */
  activeId?: string | number | null
  /** Marker omitted from the GPU layers, for example while a DOM marker represents it. */
  hiddenId?: string | number | null
  /** Active ring color. */
  activeRingColor?: string
  /** Show one shared tooltip for hovered marker labels. */
  showLabels?: boolean
  /** Called when a marker is clicked. */
  onclick?: (point: MarkerLayerPoint, event: MapLayerMouseEvent) => void
  /** Called when the pointer enters a marker. */
  onmouseenter?: (point: MarkerLayerPoint, event: MapLayerMouseEvent) => void
  /** Called when the pointer leaves a marker. */
  onmouseleave?: (point: MarkerLayerPoint, event: MapLayerMouseEvent) => void
  /** Called once after the initial GeoJSON source has loaded. */
  onready?: () => void
}

interface MarkerVisual {
  imageId: string
  size: MarkerSize
  color: string
  strokeColor: string
  icon?: MarkerLayerIconValue
  iconColor: string
  badges: MarkerBadge[]
  badgeStrokeColor: string
  hoverImageId: string
}

interface Tooltip {
  x: number
  y: number
  label: string
}

const EMPTY_BADGES: MarkerBadge[] = []

export function MarkerLayer(props: MarkerLayerProps): JSX.Element {
  const ctx = getMapContext()
  const instanceId = `shadcn-marker-layer-${Math.random().toString(36).slice(2)}`
  const sourceId = `${instanceId}-source`
  const hoverSourceId = `${instanceId}-hover-source`
  const shadowLayerId = `${instanceId}-shadow`
  const activeLayerId = `${instanceId}-active`
  const markerLayerId = `${instanceId}-marker`
  const hoverLayerId = `${instanceId}-hover`
  const interactionLayerIds = [markerLayerId, hoverLayerId]

  let map: MapLibreMap | null = null
  let pendingMap: MapLibreMap | null = null
  let points: MarkerLayerPoint[] = []
  let color = '#2563eb'
  let size: MarkerSize = 'md'
  let icon: MarkerLayerIconValue | undefined
  let iconColor = '#ffffff'
  let badges: MarkerBadge[] = EMPTY_BADGES
  let strokeColor: string | undefined
  let activeId: string | number | null = null
  let hiddenId: string | number | null = null
  let activeRingColor = 'rgba(59, 130, 246, 0.5)'
  let showLabels = true
  let onclick: MarkerLayerProps['onclick']
  let onmouseenter: MarkerLayerProps['onmouseenter']
  let onmouseleave: MarkerLayerProps['onmouseleave']
  let onready: MarkerLayerProps['onready']
  let resolvedMode: 'dark' | 'light' = 'dark'
  let stateInitialized = false
  let settled = false

  let pointsById = new Map<string, MarkerLayerPoint>()
  const markerVisuals = new Map<string, MarkerVisual>()
  const pendingMarkerImages = new Map<string, Promise<CompositeMarkerImage>>()
  const registeredImageIds = new Set<string>()
  let hoveredPoint: MarkerLayerPoint | null = null
  let eventsAttached = false
  let readyEmitted = false
  let readyFrame: number | null = null
  let ensureFrame: number | null = null
  let appliedPoints: MarkerLayerPoint[] | null = null
  let appliedColor: string | null = null
  let appliedSize: MarkerSize | null = null
  let appliedIcon: MarkerLayerIconValue | null | undefined = null
  let appliedIconColor: string | null = null
  let appliedBadges: MarkerBadge[] | null = null
  let appliedStrokeColor: string | null = null
  let appliedResolvedMode: 'dark' | 'light' | null = null
  let nextVisualId = 0
  let styleReady = true
  let styleGeneration = 0
  let dataGeneration = 0
  let detachMapEvents: (() => void) | null = null
  let mapRemoved = false
  const [tooltip, setTooltip] = createSignal<Tooltip | null>(null, { ownedWrite: true })

  function pointKey(id: string | number) {
    return `${typeof id}:${id}`
  }

  function getResolvedStrokeColor() {
    return (
      strokeColor ?? (resolvedMode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')
    )
  }

  function getIconKey(value?: MarkerLayerIconValue) {
    if (typeof value === 'string') {
      return ['class', value]
    }
    if (value) {
      return ['svg', value.svgBody, value.svgWidth, value.svgHeight]
    }
    return ['default']
  }

  function getBadgesKey(value: MarkerBadge[]) {
    return value.map(badge => [
      badge.icon,
      badge.svgBody,
      badge.svgWidth,
      badge.svgHeight,
      badge.color,
      badge.textColor,
      badge.position,
    ])
  }

  function getMarkerVisual(point: MarkerLayerPoint) {
    const resolvedSize = point.size ?? size
    const resolvedColor = point.color ?? color
    const resolvedStrokeColor = getResolvedStrokeColor()
    const resolvedIcon = point.icon ?? icon
    const resolvedIconColor = point.iconColor ?? iconColor
    const resolvedBadges = point.badges ?? badges
    const badgeStrokeColor =
      resolvedMode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
    const key = JSON.stringify([
      resolvedSize,
      resolvedColor,
      resolvedStrokeColor,
      getIconKey(resolvedIcon),
      resolvedIconColor,
      getBadgesKey(resolvedBadges),
      badgeStrokeColor,
    ])
    let visual = markerVisuals.get(key)
    if (!visual) {
      const imageId = `${instanceId}-visual-${nextVisualId++}`
      const badgesByPosition = new Map<string, number>()
      for (const badge of resolvedBadges) {
        const position = badge.position ?? 'top-right'
        badgesByPosition.set(position, (badgesByPosition.get(position) ?? 0) + 1)
      }
      const hasExpandableBadges = Array.from(badgesByPosition.values()).some(count => count > 1)
      visual = {
        imageId,
        hoverImageId: hasExpandableBadges ? `${imageId}-hover` : imageId,
        size: resolvedSize,
        color: resolvedColor,
        strokeColor: resolvedStrokeColor,
        icon: resolvedIcon,
        iconColor: resolvedIconColor,
        badges: resolvedBadges,
        badgeStrokeColor,
      }
      markerVisuals.set(key, visual)
    }
    return visual
  }

  function buildFeature(point: MarkerLayerPoint, index: number): Feature<Point> {
    const visual = getMarkerVisual(point)
    return {
      type: 'Feature',
      id: point.id,
      geometry: {
        type: 'Point',
        coordinates: point.lngLat,
      },
      properties: {
        ...point.properties,
        markerId: point.id,
        markerLabel: point.label ?? '',
        markerColor: point.color ?? color,
        markerSize: point.size ?? size,
        markerImage: visual.imageId,
        markerHoverImage: visual.hoverImageId,
        markerOrder: index,
      },
    }
  }

  function buildGeoJSON(): FeatureCollection<Point> {
    pointsById = new Map(points.map(point => [pointKey(point.id), point]))
    return {
      type: 'FeatureCollection',
      features: points.map(buildFeature),
    }
  }

  function buildHoverGeoJSON(): FeatureCollection<Point> {
    if (!hoveredPoint || (hiddenId !== null && pointKey(hiddenId) === pointKey(hoveredPoint.id))) {
      return { type: 'FeatureCollection', features: [] }
    }
    const visual = getMarkerVisual(hoveredPoint)
    if (visual.hoverImageId === visual.imageId) {
      return { type: 'FeatureCollection', features: [] }
    }
    return {
      type: 'FeatureCollection',
      features: [buildFeature(hoveredPoint, 0)],
    }
  }

  function updateHoverSourceData() {
    const source = map?.getSource(hoverSourceId) as GeoJSONSource | undefined
    source?.setData(buildHoverGeoJSON())
  }

  function getHitFromEvent(event: MapLayerMouseEvent) {
    for (const feature of event.features ?? []) {
      // MVT only supports numeric feature IDs and can coerce string IDs to 0.
      // Our explicit marker property preserves both the value and its type.
      const id = feature.properties?.markerId ?? feature.id
      if (typeof id !== 'string' && typeof id !== 'number') {
        continue
      }
      const point = pointsById.get(pointKey(id))
      if (!point || !map) {
        continue
      }

      const wrappedLongitude =
        point.lngLat[0] + Math.round((event.lngLat.lng - point.lngLat[0]) / 360) * 360
      const markerPosition = map.project([wrappedLongitude, point.lngLat[1]])
      const x = event.point.x - markerPosition.x
      const y = event.point.y - markerPosition.y
      const pointSize = point.size ?? size
      const expanded = feature.layer.id === hoverLayerId
      const pointBadges = point.badges ?? badges
      const badge = getMarkerBadgeHitCircles(pointSize, pointBadges, expanded).find(
        circle => (x - circle.x) ** 2 + (y - circle.y) ** 2 <= circle.radius ** 2,
      )
      if (badge) {
        return { point, badgeLabel: badge.label }
      }

      const markerRadius = markerVisualSizes[pointSize].diameter / 2
      if (x * x + y * y <= markerRadius * markerRadius) {
        return { point }
      }
    }
    return null
  }

  function handleClick(event: MapLayerMouseEvent) {
    const hit = getHitFromEvent(event)
    if (hit) {
      // This is a marker click, not a background click. MapLibre delegates
      // reuse the same event; stopping the DOM event cannot stop map listeners.
      event.preventDefault()
      onclick?.(hit.point, event)
    }
  }

  function handleMouseEnter(event: MapLayerMouseEvent) {
    const hit = getHitFromEvent(event)
    if (!hit) {
      if (map) {
        map.getCanvas().style.cursor = ''
      }
      if (hoveredPoint) {
        onmouseleave?.(hoveredPoint, event)
        hoveredPoint = null
        updateHoverSourceData()
      }
      setTooltip(null)
      return
    }

    const nextPoint = hit.point
    if (map) {
      map.getCanvas().style.cursor = 'pointer'
    }
    const tooltipLabel = hit.badgeLabel || nextPoint.label
    if (showLabels && tooltipLabel) {
      const pointSize = nextPoint.size ?? size
      const markerPosition = map?.project(nextPoint.lngLat)
      setTooltip({
        x: markerPosition?.x ?? event.point.x,
        y: (markerPosition?.y ?? event.point.y) - markerVisualSizes[pointSize].diameter / 2 - 8,
        label: tooltipLabel,
      })
    } else {
      setTooltip(null)
    }

    if (!hoveredPoint || pointKey(nextPoint.id) !== pointKey(hoveredPoint.id)) {
      if (hoveredPoint) {
        onmouseleave?.(hoveredPoint, event)
      }
      hoveredPoint = nextPoint
      updateHoverSourceData()
      onmouseenter?.(nextPoint, event)
    }
  }

  function handleMouseLeave(event: MapLayerMouseEvent) {
    if (map) {
      map.getCanvas().style.cursor = ''
    }
    if (hoveredPoint) {
      onmouseleave?.(hoveredPoint, event)
      hoveredPoint = null
      updateHoverSourceData()
    }
    setTooltip(null)
  }

  function attachEvents(currentMap: MapLibreMap) {
    if (eventsAttached) {
      return
    }
    currentMap.on('click', interactionLayerIds, handleClick)
    currentMap.on('mousemove', interactionLayerIds, handleMouseEnter)
    currentMap.on('mouseleave', interactionLayerIds, handleMouseLeave)
    eventsAttached = true
  }

  function detachEvents(currentMap: MapLibreMap) {
    if (!eventsAttached) {
      return
    }
    currentMap.off('click', interactionLayerIds, handleClick)
    currentMap.off('mousemove', interactionLayerIds, handleMouseEnter)
    currentMap.off('mouseleave', interactionLayerIds, handleMouseLeave)
    hoveredPoint = null
    if (!mapRemoved) {
      currentMap.getCanvas().style.cursor = ''
      updateHoverSourceData()
    }
    setTooltip(null)
    eventsAttached = false
  }

  function applyFilters() {
    if (!map) {
      return
    }

    if (hiddenId !== null && hoveredPoint && pointKey(hiddenId) === pointKey(hoveredPoint.id)) {
      map.getCanvas().style.cursor = ''
      hoveredPoint = null
      setTooltip(null)
      updateHoverSourceData()
    }

    const visibilityFilter: FilterSpecification | null =
      hiddenId === null ? null : ['!=', ['get', 'markerId'], hiddenId]
    if (map.getLayer(shadowLayerId)) {
      map.setFilter(shadowLayerId, visibilityFilter)
    }
    if (map.getLayer(markerLayerId)) {
      map.setFilter(markerLayerId, visibilityFilter)
    }
    if (!map.getLayer(activeLayerId)) {
      return
    }

    const activeFilter: FilterSpecification =
      activeId === null ? ['has', '__shadcnMapActive'] : ['==', ['get', 'markerId'], activeId]
    map.setFilter(
      activeLayerId,
      visibilityFilter ? ['all', activeFilter, visibilityFilter] : activeFilter,
    )
  }

  function applyThemeColors() {
    if (map?.getLayer(activeLayerId)) {
      map.setPaintProperty(activeLayerId, 'circle-color', activeRingColor)
    }
  }

  async function ensureMarkerImages(
    currentMap: MapLibreMap,
    visuals: Set<MarkerVisual>,
    expectedStyleGeneration: number,
  ) {
    const imageRequests = Array.from(visuals).flatMap(visual => [
      { imageId: visual.imageId, visual, expandedBadges: false },
      ...(visual.hoverImageId === visual.imageId
        ? []
        : [{ imageId: visual.hoverImageId, visual, expandedBadges: true }]),
    ])
    const results = await Promise.all(
      imageRequests.map(async ({ imageId, visual, expandedBadges }) => {
        if (currentMap.hasImage(imageId)) {
          registeredImageIds.add(imageId)
          return true
        }

        let pendingImage = pendingMarkerImages.get(imageId)
        if (!pendingImage) {
          pendingImage =
            visual.icon || visual.badges.length > 0
              ? createCompositeMarkerImage({
                  size: visual.size,
                  color: visual.color,
                  strokeColor: visual.strokeColor,
                  icon: visual.icon,
                  iconColor: visual.iconColor,
                  badges: visual.badges,
                  badgeStrokeColor: visual.badgeStrokeColor,
                  expandedBadges,
                }).catch(error => {
                  console.warn(
                    '[shadcn-map] Unable to render a custom MarkerLayer visual. Using the default icon.',
                    error,
                  )
                  return createDefaultMarkerImage({
                    size: visual.size,
                    color: visual.color,
                    strokeColor: visual.strokeColor,
                    iconColor: visual.iconColor,
                    badges: visual.badges,
                    badgeStrokeColor: visual.badgeStrokeColor,
                    expandedBadges,
                  })
                })
              : Promise.resolve(
                  createDefaultMarkerImage({
                    size: visual.size,
                    color: visual.color,
                    strokeColor: visual.strokeColor,
                    iconColor: visual.iconColor,
                  }),
                )
          pendingMarkerImages.set(imageId, pendingImage)
        }

        try {
          const image = await pendingImage
          if (map !== currentMap || expectedStyleGeneration !== styleGeneration || !styleReady) {
            return false
          }
          if (!currentMap.hasImage(imageId)) {
            currentMap.addImage(imageId, image.image, { pixelRatio: image.pixelRatio })
          }
          registeredImageIds.add(imageId)
          return true
        } catch (error) {
          console.warn('[shadcn-map] Unable to register a MarkerLayer icon.', error)
          return false
        } finally {
          if (pendingMarkerImages.get(imageId) === pendingImage) {
            pendingMarkerImages.delete(imageId)
          }
        }
      }),
    )
    return results.every(Boolean)
  }

  function markDataApplied() {
    appliedPoints = points
    appliedColor = color
    appliedSize = size
    appliedIcon = icon
    appliedIconColor = iconColor
    appliedBadges = badges
    appliedStrokeColor = getResolvedStrokeColor()
    appliedResolvedMode = resolvedMode
  }

  function sourceDataNeedsUpdate() {
    return (
      appliedPoints !== points ||
      appliedColor !== color ||
      appliedSize !== size ||
      appliedIcon !== icon ||
      appliedIconColor !== iconColor ||
      appliedBadges !== badges ||
      appliedStrokeColor !== getResolvedStrokeColor() ||
      appliedResolvedMode !== resolvedMode
    )
  }

  function updateSourceData(currentMap: MapLibreMap) {
    if (!currentMap.getSource(sourceId) || !sourceDataNeedsUpdate()) {
      return
    }
    const source = currentMap.getSource(sourceId) as GeoJSONSource | undefined
    if (!source) {
      return
    }

    const data = buildGeoJSON()
    if (hoveredPoint) {
      const nextHoveredPoint = pointsById.get(pointKey(hoveredPoint.id))
      if (nextHoveredPoint) {
        hoveredPoint = nextHoveredPoint
      } else {
        currentMap.getCanvas().style.cursor = ''
        hoveredPoint = null
        setTooltip(null)
      }
    }
    source.setData(data)
    updateHoverSourceData()
    markDataApplied()
  }

  function pruneUnusedMarkerImages(currentMap: MapLibreMap) {
    const usedImageIds = new Set(points.map(point => getMarkerVisual(point).imageId))
    for (const [key, visual] of markerVisuals) {
      if (usedImageIds.has(visual.imageId)) {
        continue
      }
      if (currentMap.hasImage(visual.imageId)) {
        currentMap.removeImage(visual.imageId)
      }
      if (visual.hoverImageId !== visual.imageId && currentMap.hasImage(visual.hoverImageId)) {
        currentMap.removeImage(visual.hoverImageId)
      }
      registeredImageIds.delete(visual.imageId)
      registeredImageIds.delete(visual.hoverImageId)
      markerVisuals.delete(key)
    }
  }

  function maybeEmitReady() {
    if (
      readyEmitted ||
      readyFrame !== null ||
      !map?.getSource(sourceId) ||
      !map.isSourceLoaded(sourceId)
    ) {
      return
    }
    readyFrame = requestAnimationFrame(() => {
      readyFrame = null
      if (readyEmitted || !map?.getSource(sourceId) || !map.isSourceLoaded(sourceId)) {
        return
      }
      readyEmitted = true
      onready?.()
    })
  }

  function addLayers(currentMap: MapLibreMap) {
    if (!currentMap.getLayer(shadowLayerId)) {
      currentMap.addLayer({
        id: shadowLayerId,
        type: 'circle',
        source: sourceId,
        layout: { 'circle-sort-key': ['get', 'markerOrder'] },
        paint: {
          'circle-radius': ['match', ['get', 'markerSize'], 'sm', 14, 'lg', 22, 18],
          'circle-color': '#000000',
          'circle-opacity': 0.3,
          'circle-blur': 0.55,
          'circle-translate': [0, 2],
          'circle-translate-anchor': 'viewport',
        },
      })
    }
    if (!currentMap.getLayer(activeLayerId)) {
      currentMap.addLayer({
        id: activeLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', '__shadcnMapActive'],
        layout: { 'circle-sort-key': ['get', 'markerOrder'] },
        paint: {
          'circle-radius': ['match', ['get', 'markerSize'], 'sm', 18, 'lg', 28, 23],
          'circle-color': activeRingColor,
        },
      })
    }
    if (!currentMap.getLayer(markerLayerId)) {
      currentMap.addLayer({
        id: markerLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': ['get', 'markerImage'],
          'symbol-sort-key': ['get', 'markerOrder'],
          'symbol-z-order': 'source',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport',
        },
      })
    }
    if (!currentMap.getLayer(hoverLayerId)) {
      currentMap.addLayer({
        id: hoverLayerId,
        type: 'symbol',
        source: hoverSourceId,
        layout: {
          'icon-image': ['get', 'markerHoverImage'],
          'symbol-sort-key': ['get', 'markerOrder'],
          'symbol-z-order': 'source',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport',
        },
      })
    }
  }

  async function ensureResources(
    expectedStyleGeneration = styleGeneration,
    expectedDataGeneration = dataGeneration,
  ): Promise<void> {
    const currentMap = map
    if (!currentMap || !styleReady) {
      return
    }

    const visuals = new Set(points.map(point => getMarkerVisual(point)))
    const imagesReady = await ensureMarkerImages(currentMap, visuals, expectedStyleGeneration)
    if (
      !imagesReady ||
      map !== currentMap ||
      expectedStyleGeneration !== styleGeneration ||
      !styleReady
    ) {
      return
    }
    if (expectedDataGeneration !== dataGeneration) {
      return ensureResources(styleGeneration, dataGeneration)
    }

    if (!currentMap.getSource(sourceId)) {
      currentMap.addSource(sourceId, {
        type: 'geojson',
        promoteId: 'markerId',
        data: buildGeoJSON(),
      })
      markDataApplied()
    } else {
      updateSourceData(currentMap)
    }
    if (!currentMap.getSource(hoverSourceId)) {
      currentMap.addSource(hoverSourceId, {
        type: 'geojson',
        promoteId: 'markerId',
        data: buildHoverGeoJSON(),
      })
    }

    if (
      map !== currentMap ||
      expectedStyleGeneration !== styleGeneration ||
      expectedDataGeneration !== dataGeneration ||
      !currentMap.getSource(sourceId) ||
      !currentMap.getSource(hoverSourceId)
    ) {
      return
    }
    addLayers(currentMap)
    attachEvents(currentMap)
    applyFilters()
    applyThemeColors()
    maybeEmitReady()
  }

  function scheduleEnsureResources() {
    if (ensureFrame !== null) {
      return
    }
    ensureFrame = requestAnimationFrame(() => {
      ensureFrame = null
      void ensureResources()
    })
  }

  function resourcesAreMissing(currentMap: MapLibreMap) {
    return (
      !currentMap.getSource(sourceId) ||
      !currentMap.getSource(hoverSourceId) ||
      !currentMap.getLayer(shadowLayerId) ||
      !currentMap.getLayer(activeLayerId) ||
      !currentMap.getLayer(markerLayerId) ||
      !currentMap.getLayer(hoverLayerId) ||
      points.some(point => {
        const visual = getMarkerVisual(point)
        return !currentMap.hasImage(visual.imageId) || !currentMap.hasImage(visual.hoverImageId)
      })
    )
  }

  function removeResources(currentMap: MapLibreMap) {
    if (mapRemoved) {
      registeredImageIds.clear()
      return
    }
    if (currentMap.getLayer(hoverLayerId)) {
      currentMap.removeLayer(hoverLayerId)
    }
    if (currentMap.getLayer(markerLayerId)) {
      currentMap.removeLayer(markerLayerId)
    }
    if (currentMap.getLayer(activeLayerId)) {
      currentMap.removeLayer(activeLayerId)
    }
    if (currentMap.getLayer(shadowLayerId)) {
      currentMap.removeLayer(shadowLayerId)
    }
    if (currentMap.getSource(hoverSourceId)) {
      currentMap.removeSource(hoverSourceId)
    }
    if (currentMap.getSource(sourceId)) {
      currentMap.removeSource(sourceId)
    }
    for (const imageId of registeredImageIds) {
      if (currentMap.hasImage(imageId)) {
        currentMap.removeImage(imageId)
      }
    }
    registeredImageIds.clear()
  }

  function disconnectMap(clearVisuals = false) {
    const currentMap = map
    if (!currentMap) {
      if (clearVisuals) {
        markerVisuals.clear()
      }
      return
    }

    detachMapEvents?.()
    detachMapEvents = null
    detachEvents(currentMap)
    if (readyFrame !== null) {
      cancelAnimationFrame(readyFrame)
      readyFrame = null
    }
    if (ensureFrame !== null) {
      cancelAnimationFrame(ensureFrame)
      ensureFrame = null
    }
    removeResources(currentMap)
    styleGeneration += 1
    dataGeneration += 1
    pendingMarkerImages.clear()
    if (clearVisuals) {
      markerVisuals.clear()
    }
    map = null
  }

  function connectMap(nextMap: MapLibreMap | null) {
    if (map === nextMap) {
      return
    }
    disconnectMap()
    map = nextMap
    mapRemoved = false
    if (!nextMap) {
      return
    }

    styleReady = Boolean(nextMap.isStyleLoaded())
    const handleMoveStart = () => {
      nextMap.getCanvas().style.cursor = ''
      hoveredPoint = null
      updateHoverSourceData()
      setTooltip(null)
    }
    const handleStyleLoad = () => {
      styleGeneration += 1
      styleReady = true
      void ensureResources(styleGeneration)
    }
    const handleStyleDataLoading = () => {
      styleGeneration += 1
      styleReady = false
    }
    const handleStyleData = () => {
      if (styleReady && resourcesAreMissing(nextMap)) {
        nextMap.getCanvas().style.cursor = ''
        hoveredPoint = null
        setTooltip(null)
        scheduleEnsureResources()
      }
    }
    const handleSourceData = (event: { sourceId?: string }) => {
      // Style replacement emits source metadata after removing the source.
      if (event.sourceId !== sourceId || !nextMap.getSource(sourceId)) {
        return
      }
      if (nextMap.isSourceLoaded(sourceId)) {
        if (sourceDataNeedsUpdate()) {
          void ensureResources(styleGeneration, dataGeneration)
        } else {
          pruneUnusedMarkerImages(nextMap)
        }
      }
      maybeEmitReady()
    }
    const handleMapRemove = () => {
      mapRemoved = true
      disconnectMap()
    }

    nextMap.on('style.load', handleStyleLoad)
    nextMap.on('styledataloading', handleStyleDataLoading)
    nextMap.on('styledata', handleStyleData)
    nextMap.on('sourcedata', handleSourceData)
    nextMap.on('movestart', handleMoveStart)
    nextMap.on('remove', handleMapRemove)
    detachMapEvents = () => {
      nextMap.off('style.load', handleStyleLoad)
      nextMap.off('styledataloading', handleStyleDataLoading)
      nextMap.off('styledata', handleStyleData)
      nextMap.off('sourcedata', handleSourceData)
      nextMap.off('movestart', handleMoveStart)
      nextMap.off('remove', handleMapRemove)
    }
    if (styleReady) {
      void ensureResources()
    }
  }

  createEffect(
    () => {
      const icon = props.icon
      return {
        map: ctx.map,
        resolvedMode: ctx.resolvedMode,
        points: deep(props.points),
        color: props.color ?? '#2563eb',
        size: props.size ?? 'md',
        icon: typeof icon === 'object' ? deep(icon) : icon,
        iconColor: props.iconColor ?? '#ffffff',
        badges: deep(props.badges ?? EMPTY_BADGES),
        strokeColor: props.strokeColor,
        activeId: props.activeId ?? null,
        hiddenId: props.hiddenId ?? null,
        activeRingColor: props.activeRingColor ?? 'rgba(59, 130, 246, 0.5)',
        showLabels: props.showLabels ?? true,
        onclick: props.onclick,
        onmouseenter: props.onmouseenter,
        onmouseleave: props.onmouseleave,
        onready: props.onready,
      }
    },
    next => {
      const dataChanged =
        !stateInitialized ||
        points !== next.points ||
        color !== next.color ||
        size !== next.size ||
        icon !== next.icon ||
        iconColor !== next.iconColor ||
        badges !== next.badges ||
        strokeColor !== next.strokeColor ||
        resolvedMode !== next.resolvedMode
      const filtersChanged =
        !stateInitialized || activeId !== next.activeId || hiddenId !== next.hiddenId
      const themeChanged =
        !stateInitialized ||
        resolvedMode !== next.resolvedMode ||
        strokeColor !== next.strokeColor ||
        activeRingColor !== next.activeRingColor

      pendingMap = next.map
      resolvedMode = next.resolvedMode
      points = next.points
      color = next.color
      size = next.size
      icon = next.icon
      iconColor = next.iconColor
      badges = next.badges
      strokeColor = next.strokeColor
      activeId = next.activeId
      hiddenId = next.hiddenId
      activeRingColor = next.activeRingColor
      showLabels = next.showLabels
      onclick = next.onclick
      onmouseenter = next.onmouseenter
      onmouseleave = next.onmouseleave
      onready = next.onready
      stateInitialized = true

      if (dataChanged) {
        dataGeneration += 1
      }
      if (settled) {
        connectMap(pendingMap)
      }
      if (!map || !styleReady) {
        return
      }
      if (dataChanged) {
        void ensureResources(styleGeneration, dataGeneration)
      }
      if (filtersChanged) {
        applyFilters()
      }
      if (themeChanged) {
        applyThemeColors()
      }
    },
  )

  onSettled(() => {
    settled = true
    connectMap(pendingMap)
    return () => {
      settled = false
      disconnectMap(true)
    }
  })

  return (
    <Show when={props.showLabels !== false && ctx.activePopupMarkerId === null ? tooltip() : null}>
      {visibleTooltip => (
        <div
          class="marker-layer-tooltip"
          data-map-mode={ctx.resolvedMode}
          style={{
            left: `${visibleTooltip().x}px`,
            top: `${visibleTooltip().y}px`,
          }}
        >
          {visibleTooltip().label}
        </div>
      )}
    </Show>
  )
}
