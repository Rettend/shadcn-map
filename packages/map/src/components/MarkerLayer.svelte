<script lang='ts' module>
  import type { MapLayerMouseEvent } from 'maplibre-gl'
  import type { MarkerSize } from '../types'

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

  const MAP_PIN_PATH = 'M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32'

  const MARKER_VISUALS: Record<MarkerSize, { diameter: number, iconSize: number }> = {
    sm: { diameter: 28, iconSize: 16 },
    md: { diameter: 36, iconSize: 20 },
    lg: { diameter: 44, iconSize: 24 },
  }

  function createMarkerImage(size: MarkerSize, color: string, strokeColor: string): { data: ImageData, pixelRatio: number } {
    const pixelRatio = 2
    const { diameter, iconSize } = MARKER_VISUALS[size]
    const canvas = document.createElement('canvas')
    canvas.width = diameter * pixelRatio
    canvas.height = diameter * pixelRatio

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to create the MarkerLayer icon canvas.')
    }

    context.scale(pixelRatio, pixelRatio)
    context.beginPath()
    context.arc(diameter / 2, diameter / 2, diameter / 2 - 1, 0, Math.PI * 2)
    context.fillStyle = color
    context.fill()
    context.lineWidth = 2
    context.strokeStyle = strokeColor
    context.stroke()

    context.translate((diameter - iconSize) / 2, (diameter - iconSize) / 2)
    context.scale(iconSize / 256, iconSize / 256)
    context.fillStyle = '#ffffff'
    context.fill(new Path2D(MAP_PIN_PATH))
    return {
      data: context.getImageData(0, 0, canvas.width, canvas.height),
      pixelRatio,
    }
  }
</script>

<script lang='ts'>
  import type { FeatureCollection, Point } from 'geojson'
  import type { FilterSpecification } from 'maplibre-gl'
  import type { GeoJSONSource, MapLibreMap } from '../types'
  import { onMount } from 'svelte'
  import { getMapContext } from '../context.svelte'

  const {
    points,
    color = '#2563eb',
    size = 'md',
    strokeColor,
    activeId = null,
    hiddenId = null,
    activeRingColor = 'rgba(59, 130, 246, 0.5)',
    showLabels = true,
    onclick,
    onmouseenter,
    onmouseleave,
    onready,
  }: MarkerLayerProps = $props()

  const ctx = getMapContext()
  const instanceId = `shadcn-marker-layer-${Math.random().toString(36).slice(2)}`
  const sourceId = `${instanceId}-source`
  const shadowLayerId = `${instanceId}-shadow`
  const activeLayerId = `${instanceId}-active`
  const markerLayerId = `${instanceId}-marker`

  let map: MapLibreMap | null = null
  let pointsById = new Map<string, MarkerLayerPoint>()
  const markerVisuals = new Map<string, { imageId: string, size: MarkerSize, color: string, strokeColor: string }>()
  let hoveredPoint: MarkerLayerPoint | null = null
  let eventsAttached = false
  let readyEmitted = false
  let readyFrame: number | null = null
  let ensureFrame: number | null = null
  let appliedPoints: MarkerLayerPoint[] | null = null
  let appliedColor: string | null = null
  let appliedSize: MarkerSize | null = null
  let appliedStrokeColor: string | null = null
  let nextVisualId = 0
  let tooltip = $state<{ x: number, y: number, label: string } | null>(null)

  function pointKey(id: string | number) {
    return `${typeof id}:${id}`
  }

  function getResolvedStrokeColor() {
    return strokeColor ?? (ctx.resolvedMode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')
  }

  function getMarkerVisual(point: MarkerLayerPoint) {
    const resolvedSize = point.size ?? size
    const resolvedColor = point.color ?? color
    const resolvedStrokeColor = getResolvedStrokeColor()
    const key = JSON.stringify([resolvedSize, resolvedColor, resolvedStrokeColor])
    let visual = markerVisuals.get(key)
    if (!visual) {
      visual = {
        imageId: `${instanceId}-visual-${nextVisualId++}`,
        size: resolvedSize,
        color: resolvedColor,
        strokeColor: resolvedStrokeColor,
      }
      markerVisuals.set(key, visual)
    }
    return visual
  }

  function buildGeoJSON(): FeatureCollection<Point> {
    pointsById = new Map(points.map(point => [pointKey(point.id), point]))

    return {
      type: 'FeatureCollection',
      features: points.map((point, index) => ({
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
          markerImage: getMarkerVisual(point).imageId,
          markerOrder: index,
        },
      })),
    }
  }

  function getPointFromEvent(event: MapLayerMouseEvent) {
    const feature = event.features?.[0]
    const id = feature?.id ?? feature?.properties?.markerId
    if (typeof id !== 'string' && typeof id !== 'number') {
      return null
    }
    return pointsById.get(pointKey(id)) ?? null
  }

  function handleClick(event: MapLayerMouseEvent) {
    const point = getPointFromEvent(event)
    if (point) {
      onclick?.(point, event)
    }
  }

  function handleMouseEnter(event: MapLayerMouseEvent) {
    if (map) {
      map.getCanvas().style.cursor = 'pointer'
    }
    const nextPoint = getPointFromEvent(event)
    if (showLabels && nextPoint?.label) {
      const pointSize = nextPoint.size ?? size
      const markerPosition = map?.project(nextPoint.lngLat)
      tooltip = {
        x: markerPosition?.x ?? event.point.x,
        y: (markerPosition?.y ?? event.point.y) - MARKER_VISUALS[pointSize].diameter / 2 - 8,
        label: nextPoint.label,
      }
    }
    else {
      tooltip = null
    }
    if (nextPoint && (!hoveredPoint || pointKey(nextPoint.id) !== pointKey(hoveredPoint.id))) {
      if (hoveredPoint) {
        onmouseleave?.(hoveredPoint, event)
      }
      hoveredPoint = nextPoint
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
    }
    tooltip = null
  }

  function attachEvents(currentMap: MapLibreMap) {
    if (eventsAttached) {
      return
    }
    currentMap.on('click', markerLayerId, handleClick)
    currentMap.on('mousemove', markerLayerId, handleMouseEnter)
    currentMap.on('mouseleave', markerLayerId, handleMouseLeave)
    eventsAttached = true
  }

  function detachEvents(currentMap: MapLibreMap) {
    if (!eventsAttached) {
      return
    }
    currentMap.off('click', markerLayerId, handleClick)
    currentMap.off('mousemove', markerLayerId, handleMouseEnter)
    currentMap.off('mouseleave', markerLayerId, handleMouseLeave)
    currentMap.getCanvas().style.cursor = ''
    hoveredPoint = null
    tooltip = null
    eventsAttached = false
  }

  function applyFilters() {
    if (!map) {
      return
    }

    if (hiddenId !== null && hoveredPoint && pointKey(hiddenId) === pointKey(hoveredPoint.id)) {
      map.getCanvas().style.cursor = ''
      hoveredPoint = null
      tooltip = null
    }

    const visibilityFilter: FilterSpecification | null = hiddenId === null
      ? null
      : ['!=', ['get', 'markerId'], hiddenId]

    if (map.getLayer(shadowLayerId)) {
      map.setFilter(shadowLayerId, visibilityFilter)
    }
    if (map.getLayer(markerLayerId)) {
      map.setFilter(markerLayerId, visibilityFilter)
    }
    if (!map.getLayer(activeLayerId)) {
      return
    }

    const activeFilter: FilterSpecification = activeId === null
      ? ['has', '__shadcnMapActive']
      : ['==', ['get', 'markerId'], activeId]
    const combinedFilter: FilterSpecification = visibilityFilter
      ? ['all', activeFilter, visibilityFilter]
      : activeFilter
    map.setFilter(
      activeLayerId,
      combinedFilter,
    )
  }

  function applyThemeColors() {
    if (map?.getLayer(activeLayerId)) {
      map.setPaintProperty(activeLayerId, 'circle-color', activeRingColor)
    }
  }

  function ensureMarkerImages(currentMap: MapLibreMap) {
    for (const point of points) {
      const visual = getMarkerVisual(point)
      if (!currentMap.hasImage(visual.imageId)) {
        const image = createMarkerImage(visual.size, visual.color, visual.strokeColor)
        currentMap.addImage(visual.imageId, image.data, { pixelRatio: image.pixelRatio })
      }
    }
  }

  function markDataApplied() {
    appliedPoints = points
    appliedColor = color
    appliedSize = size
    appliedStrokeColor = getResolvedStrokeColor()
  }

  function sourceDataNeedsUpdate() {
    return appliedPoints !== points
      || appliedColor !== color
      || appliedSize !== size
      || appliedStrokeColor !== getResolvedStrokeColor()
  }

  function updateSourceData(currentMap: MapLibreMap) {
    const source = currentMap.getSource(sourceId) as GeoJSONSource | undefined
    if (!source || !sourceDataNeedsUpdate()) {
      return
    }
    ensureMarkerImages(currentMap)
    const data = buildGeoJSON()
    if (hoveredPoint && !pointsById.has(pointKey(hoveredPoint.id))) {
      currentMap.getCanvas().style.cursor = ''
      hoveredPoint = null
      tooltip = null
    }
    source.setData(data)
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
      markerVisuals.delete(key)
    }
  }

  function maybeEmitReady() {
    if (readyEmitted || readyFrame !== null || !map?.getSource(sourceId) || !map.isSourceLoaded(sourceId)) {
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
        layout: {
          'circle-sort-key': ['get', 'markerOrder'],
        },
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
        layout: {
          'circle-sort-key': ['get', 'markerOrder'],
        },
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
  }

  function ensureResources(styleLoadEvent = false) {
    if (!map || (!styleLoadEvent && !map.isStyleLoaded())) {
      return
    }

    ensureMarkerImages(map)
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: buildGeoJSON(),
      })
      markDataApplied()
    }
    else {
      updateSourceData(map)
    }

    addLayers(map)
    attachEvents(map)
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
      ensureResources()
    })
  }

  function resourcesAreMissing(currentMap: MapLibreMap) {
    return !currentMap.getSource(sourceId)
      || !currentMap.getLayer(shadowLayerId)
      || !currentMap.getLayer(activeLayerId)
      || !currentMap.getLayer(markerLayerId)
      || points.some(point => !currentMap.hasImage(getMarkerVisual(point).imageId))
  }

  function removeResources(currentMap: MapLibreMap) {
    if (currentMap.getLayer(markerLayerId)) {
      currentMap.removeLayer(markerLayerId)
    }
    if (currentMap.getLayer(activeLayerId)) {
      currentMap.removeLayer(activeLayerId)
    }
    if (currentMap.getLayer(shadowLayerId)) {
      currentMap.removeLayer(shadowLayerId)
    }
    if (currentMap.getSource(sourceId)) {
      currentMap.removeSource(sourceId)
    }
    for (const visual of markerVisuals.values()) {
      if (currentMap.hasImage(visual.imageId)) {
        currentMap.removeImage(visual.imageId)
      }
    }
  }

  onMount(() => {
    map = ctx.map
    if (!map) {
      return
    }

    const currentMap = map
    const handleMoveStart = () => {
      currentMap.getCanvas().style.cursor = ''
      hoveredPoint = null
      tooltip = null
    }
    const handleStyleLoad = () => ensureResources(true)
    const handleStyleData = () => {
      if (currentMap.isStyleLoaded() && resourcesAreMissing(currentMap)) {
        currentMap.getCanvas().style.cursor = ''
        hoveredPoint = null
        tooltip = null
        scheduleEnsureResources()
      }
    }
    const handleSourceData = (event: { sourceId?: string }) => {
      if (event.sourceId === sourceId) {
        if (currentMap.isSourceLoaded(sourceId)) {
          pruneUnusedMarkerImages(currentMap)
        }
        maybeEmitReady()
      }
    }

    currentMap.on('style.load', handleStyleLoad)
    currentMap.on('styledata', handleStyleData)
    currentMap.on('sourcedata', handleSourceData)
    currentMap.on('movestart', handleMoveStart)
    ensureResources()

    return () => {
      currentMap.off('style.load', handleStyleLoad)
      currentMap.off('styledata', handleStyleData)
      currentMap.off('sourcedata', handleSourceData)
      currentMap.off('movestart', handleMoveStart)
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
      markerVisuals.clear()
      map = null
    }
  })

  $effect(() => {
    void points
    void color
    void size
    void ctx.resolvedMode
    void strokeColor
    if (map?.isStyleLoaded()) {
      updateSourceData(map)
    }
  })

  $effect(() => {
    void activeId
    void hiddenId
    applyFilters()
  })

  $effect(() => {
    void ctx.resolvedMode
    void strokeColor
    void activeRingColor
    applyThemeColors()
  })
</script>

{#if showLabels && tooltip && ctx.activePopupMarkerId === null}
  <div
    class='marker-layer-tooltip'
    data-map-mode={ctx.resolvedMode}
    style:left={`${tooltip.x}px`}
    style:top={`${tooltip.y}px`}
  >
    {tooltip.label}
  </div>
{/if}

<style>
  .marker-layer-tooltip {
    position: absolute;
    z-index: 20;
    transform: translate(-50%, -100%);
    padding: 4px 8px;
    border-radius: 4px;
    background: hsl(240 10% 3.9%);
    color: hsl(0 0% 98%);
    font-size: 12px;
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;
  }

  .marker-layer-tooltip[data-map-mode='dark'] {
    background: hsl(240 5.9% 90%);
    color: hsl(240 10% 3.9%);
  }
</style>
