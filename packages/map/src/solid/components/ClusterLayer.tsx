import type { GeoJSONSource, MapLayerMouseEvent, MapLibreMap } from '../../shared/types'
import { createEffect, deep, onSettled } from 'solid-js'
import Supercluster from 'supercluster'
import { getMapContext } from '../context'

export interface ClusterPoint {
  /** Unique identifier. */
  id: string | number
  /** Position [lng, lat]. */
  lngLat: [number, number]
  /** Additional properties. */
  properties?: Record<string, unknown>
}

export interface ClusterLayerProps {
  /** Array of points to cluster. */
  points: ClusterPoint[]
  /** Click callback for individual points. */
  onclick?: (point: ClusterPoint) => void
  /** Click callback for clusters. */
  onclusterclick?: (clusterId: number, zoom: number) => void
  /** Cluster radius in pixels. */
  clusterRadius?: number
  /** Max zoom to cluster at. */
  clusterMaxZoom?: number
  /** Whether to render unclustered points. */
  showUnclustered?: boolean
  /** Callback with unclustered point ids. */
  onunclusteredchange?: (ids: Set<string>) => void
  /** Callback when the cluster source is loading. */
  onclusterloadingchange?: (loading: boolean) => void
}

interface ClusterFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: [number, number]
    }
    properties: Record<string, unknown> & { id: string | number }
  }>
}

type ClusterPointProperties = Pick<ClusterPoint, 'id'>

export function ClusterLayer(props: ClusterLayerProps): null {
  const ctx = getMapContext()

  const instanceId = `shadcn-cluster-${Math.random().toString(36).slice(2)}`
  const sourceId = `${instanceId}-source`
  const clusterLayerId = `${instanceId}-cluster`
  const clusterCountId = `${instanceId}-count`
  const unclusteredLayerId = `${instanceId}-point`

  let map: MapLibreMap | null = null
  let pendingMap: MapLibreMap | null = null
  let points: ClusterPoint[] = []
  let pointsById = new Map<string, ClusterPoint>()
  let onclick: ClusterLayerProps['onclick']
  let onclusterclick: ClusterLayerProps['onclusterclick']
  let clusterRadius = 50
  let clusterMaxZoom = 14
  let showUnclustered = true
  let onunclusteredchange: ClusterLayerProps['onunclusteredchange']
  let onclusterloadingchange: ClusterLayerProps['onclusterloadingchange']
  let loaded = false
  let resolvedMode: 'dark' | 'light' = 'dark'
  let stateInitialized = false
  let settled = false

  let detachMapEvents: (() => void) | null = null
  let detachEvents: (() => void) | null = null
  let detachClusterStateEvents: (() => void) | null = null
  let lastConfigKey = ''
  let unclusteredUpdateScheduled = false
  let cancelUnclusteredUpdate: (() => void) | null = null
  let lastUnclusteredKey = '__initial__'
  let pointsKey = ''
  let clusterLoading = false
  let supercluster: Supercluster<ClusterPointProperties, ClusterPointProperties> | null = null
  let lastSuperclusterPointsKey = ''
  let pendingDataUpdate = false
  let pendingThemeUpdate = false
  let applyingUpdates = false
  let sourceGeneration = 0
  let mapRemoved = false

  function getThemeColors() {
    return resolvedMode === 'dark'
      ? {
          clusterLow: '#3f3f46',
          clusterMid: '#52525b',
          clusterHigh: '#71717a',
          clusterStroke: '#09090b',
          clusterText: '#f4f4f5',
          point: '#38bdf8',
          pointStroke: '#0f172a',
        }
      : {
          clusterLow: '#e4e4e7',
          clusterMid: '#d4d4d8',
          clusterHigh: '#a1a1aa',
          clusterStroke: '#ffffff',
          clusterText: '#18181b',
          point: '#0284c7',
          pointStroke: '#ffffff',
        }
  }

  function buildGeoJSON(): ClusterFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point.lngLat,
        },
        properties: {
          ...point.properties,
          id: point.id,
        },
      })),
    }
  }

  function updatePointsLookup() {
    pointsById = new Map(points.map(point => [`${typeof point.id}:${point.id}`, point]))
    const nextPointsKey = points
      .map(point => `${typeof point.id}:${point.id}`)
      .sort()
      .join('|')
    if (nextPointsKey !== pointsKey) {
      pointsKey = nextPointsKey
      lastUnclusteredKey = '__initial__'
    }
  }

  function updateSourceData() {
    const source = map?.getSource(sourceId) as GeoJSONSource | undefined
    if (source) {
      sourceGeneration += 1
      source.setData(buildGeoJSON())
    }
  }

  function buildUnclusteredKey(ids: Set<string>) {
    return ids.size === 0 ? '' : Array.from(ids).sort().join('|')
  }

  function setClusterLoading(next: boolean) {
    if (clusterLoading === next) {
      return
    }
    clusterLoading = next
    onclusterloadingchange?.(next)
  }

  function ensureSupercluster() {
    const currentPointsKey = `${clusterRadius}-${clusterMaxZoom}:${points.map(point => `${typeof point.id}:${point.id}:${point.lngLat[0]},${point.lngLat[1]}`).join('|')}`
    if (supercluster && currentPointsKey === lastSuperclusterPointsKey) {
      return
    }

    supercluster = new Supercluster<ClusterPointProperties, ClusterPointProperties>({
      radius: clusterRadius,
      maxZoom: clusterMaxZoom,
      extent: 512,
      map: clusterProperties => ({ id: clusterProperties.id }),
      reduce: (accumulator, clusterProperties) => {
        accumulator.id = clusterProperties.id
      },
    })

    supercluster.load(
      points.map(point => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: point.lngLat,
        },
        properties: { id: point.id },
      })),
    )
    lastSuperclusterPointsKey = currentPointsKey
  }

  function emitUnclusteredIds() {
    if (!map || !onunclusteredchange) {
      return
    }

    ensureSupercluster()
    if (!supercluster) {
      return
    }

    const clusters = supercluster.getClusters([-180, -90, 180, 90], Math.floor(map.getZoom()))
    const ids = new Set<string>()
    for (const feature of clusters) {
      const clusterProperties = feature.properties
      if (!('cluster' in clusterProperties) || !clusterProperties.cluster) {
        const id = (clusterProperties as { id?: string | number }).id
        if (id !== undefined && id !== null) {
          ids.add(String(id))
        }
      }
    }

    const key = buildUnclusteredKey(ids)
    if (key === lastUnclusteredKey) {
      return
    }
    lastUnclusteredKey = key
    setClusterLoading(false)
    onunclusteredchange(ids)
  }

  function scheduleUnclusteredUpdate() {
    if (!onunclusteredchange || unclusteredUpdateScheduled) {
      return
    }
    unclusteredUpdateScheduled = true

    const run = () => {
      unclusteredUpdateScheduled = false
      cancelUnclusteredUpdate = null
      emitUnclusteredIds()
    }
    if (typeof requestAnimationFrame === 'function') {
      const frame = requestAnimationFrame(run)
      cancelUnclusteredUpdate = () => cancelAnimationFrame(frame)
    } else {
      const timeout = setTimeout(run, 0)
      cancelUnclusteredUpdate = () => clearTimeout(timeout)
    }
  }

  function attachClusterStateEvents(currentMap: MapLibreMap) {
    detachClusterStateEvents?.()
    detachClusterStateEvents = null
    if (!onunclusteredchange) {
      return
    }

    const handleZoomChange = () => emitUnclusteredIds()
    const handleViewChange = () => scheduleUnclusteredUpdate()
    currentMap.on('zoom', handleZoomChange)
    currentMap.on('zoomend', handleZoomChange)
    currentMap.on('move', handleViewChange)
    currentMap.on('moveend', handleViewChange)

    detachClusterStateEvents = () => {
      currentMap.off('zoom', handleZoomChange)
      currentMap.off('zoomend', handleZoomChange)
      currentMap.off('move', handleViewChange)
      currentMap.off('moveend', handleViewChange)
    }
  }

  function attachLayerEvents(currentMap: MapLibreMap) {
    detachEvents?.()
    const attachedUnclusteredLayer = showUnclustered

    const handleClusterDoubleClick = (event: MapLayerMouseEvent) => {
      event.preventDefault?.()
      const feature = event.features?.[0]
      const clusterId = Number(feature?.properties?.cluster_id)
      if (!Number.isFinite(clusterId)) {
        return
      }

      const source = currentMap.getSource(sourceId) as GeoJSONSource | undefined
      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)
        ?.coordinates
      if (!source || !coordinates) {
        return
      }

      const expectedSourceGeneration = sourceGeneration
      Promise.resolve(source.getClusterExpansionZoom(clusterId))
        .then(zoom => {
          if (
            map !== currentMap ||
            sourceGeneration !== expectedSourceGeneration ||
            currentMap.getSource(sourceId) !== source
          ) {
            return
          }
          currentMap.easeTo({ center: coordinates, zoom })
          onclusterclick?.(clusterId, zoom)
        })
        .catch(() => {})
    }

    const handlePointClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const id = feature?.properties?.id
      const point = pointsById.get(`${typeof id}:${id}`)
      if (point) {
        onclick?.(point)
        return
      }

      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)
        ?.coordinates
      if (!coordinates) {
        return
      }
      onclick?.({
        id: id ?? `${coordinates[0]}-${coordinates[1]}`,
        lngLat: coordinates,
        properties: { ...feature?.properties },
      })
    }

    const handleMouseEnter = () => {
      currentMap.getCanvas().style.cursor = 'pointer'
    }
    const handleMouseLeave = () => {
      currentMap.getCanvas().style.cursor = ''
    }

    currentMap.on('dblclick', clusterLayerId, handleClusterDoubleClick)
    currentMap.on('mouseenter', clusterLayerId, handleMouseEnter)
    currentMap.on('mouseleave', clusterLayerId, handleMouseLeave)
    if (attachedUnclusteredLayer) {
      currentMap.on('click', unclusteredLayerId, handlePointClick)
      currentMap.on('mouseenter', unclusteredLayerId, handleMouseEnter)
      currentMap.on('mouseleave', unclusteredLayerId, handleMouseLeave)
    }

    detachEvents = () => {
      currentMap.off('dblclick', clusterLayerId, handleClusterDoubleClick)
      currentMap.off('mouseenter', clusterLayerId, handleMouseEnter)
      currentMap.off('mouseleave', clusterLayerId, handleMouseLeave)
      if (attachedUnclusteredLayer) {
        currentMap.off('click', unclusteredLayerId, handlePointClick)
        currentMap.off('mouseenter', unclusteredLayerId, handleMouseEnter)
        currentMap.off('mouseleave', unclusteredLayerId, handleMouseLeave)
      }
    }
  }

  function addLayers(currentMap: MapLibreMap) {
    if (currentMap.getSource(sourceId)) {
      return
    }

    currentMap.addSource(sourceId, {
      type: 'geojson',
      data: buildGeoJSON(),
      cluster: true,
      clusterRadius,
      clusterMaxZoom,
    })

    const colors = getThemeColors()
    currentMap.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          colors.clusterLow,
          10,
          colors.clusterMid,
          50,
          colors.clusterHigh,
        ],
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 24],
        'circle-stroke-width': 1,
        'circle-stroke-color': colors.clusterStroke,
      },
    })

    currentMap.addLayer({
      id: clusterCountId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
      },
      paint: {
        'text-color': colors.clusterText,
        'text-opacity': 1,
      },
    })
    currentMap.setPaintProperty(clusterCountId, 'text-opacity-transition', {
      duration: 0,
      delay: 0,
    })
    currentMap.setPaintProperty(clusterCountId, 'text-color-transition', { duration: 0, delay: 0 })

    if (showUnclustered) {
      currentMap.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': colors.point,
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': colors.pointStroke,
        },
      })
    }
    attachLayerEvents(currentMap)
  }

  function removeLayers(currentMap: MapLibreMap) {
    sourceGeneration += 1
    detachEvents?.()
    detachEvents = null
    if (mapRemoved) {
      return
    }
    if (currentMap.getLayer(clusterCountId)) {
      currentMap.removeLayer(clusterCountId)
    }
    if (currentMap.getLayer(clusterLayerId)) {
      currentMap.removeLayer(clusterLayerId)
    }
    if (currentMap.getLayer(unclusteredLayerId)) {
      currentMap.removeLayer(unclusteredLayerId)
    }
    if (currentMap.getSource(sourceId)) {
      currentMap.removeSource(sourceId)
    }
  }

  function ensureLayers() {
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const configKey = `${clusterRadius}-${clusterMaxZoom}-${showUnclustered}`
    if (configKey !== lastConfigKey) {
      removeLayers(map)
      lastConfigKey = configKey
    }
    addLayers(map)
  }

  function applyThemeColors() {
    if (!map) {
      return
    }
    const colors = getThemeColors()
    if (map.getLayer(clusterLayerId)) {
      map.setPaintProperty(clusterLayerId, 'circle-color', [
        'step',
        ['get', 'point_count'],
        colors.clusterLow,
        10,
        colors.clusterMid,
        50,
        colors.clusterHigh,
      ])
      map.setPaintProperty(clusterLayerId, 'circle-stroke-color', colors.clusterStroke)
    }
    if (map.getLayer(clusterCountId)) {
      map.setPaintProperty(clusterCountId, 'text-color', colors.clusterText)
    }
    if (showUnclustered && map.getLayer(unclusteredLayerId)) {
      map.setPaintProperty(unclusteredLayerId, 'circle-color', colors.point)
      map.setPaintProperty(unclusteredLayerId, 'circle-stroke-color', colors.pointStroke)
    }
  }

  function applyPendingUpdates() {
    if (!map || !loaded || applyingUpdates || !map.isStyleLoaded()) {
      return
    }

    applyingUpdates = true
    try {
      ensureLayers()
      // Sources may start loading as layers are recreated. The stylesheet is
      // already available, so apply its paint updates before writing source data.
      if (pendingThemeUpdate) {
        pendingThemeUpdate = false
        applyThemeColors()
      }
      if (pendingDataUpdate) {
        pendingDataUpdate = false
        updateSourceData()
        scheduleUnclusteredUpdate()
      }
    } finally {
      applyingUpdates = false
    }
  }

  function disconnectMap() {
    const currentMap = map
    if (!currentMap) {
      return
    }
    detachMapEvents?.()
    detachMapEvents = null
    detachClusterStateEvents?.()
    detachClusterStateEvents = null
    cancelUnclusteredUpdate?.()
    cancelUnclusteredUpdate = null
    unclusteredUpdateScheduled = false
    removeLayers(currentMap)
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

    updatePointsLookup()
    attachClusterStateEvents(nextMap)

    const handleStyleLoad = () => {
      lastConfigKey = ''
      lastUnclusteredKey = '__initial__'
      setClusterLoading(true)
      pendingDataUpdate = true
      pendingThemeUpdate = true
      applyPendingUpdates()
      if (!onunclusteredchange) {
        setClusterLoading(false)
      }
    }
    const handleStyleData = () => {
      if (applyingUpdates || map !== nextMap || !nextMap.isStyleLoaded()) {
        return
      }
      if (!nextMap.getSource(sourceId)) {
        handleStyleLoad()
      } else {
        applyPendingUpdates()
      }
    }
    const handleMapRemove = () => {
      mapRemoved = true
      disconnectMap()
    }

    nextMap.on('style.load', handleStyleLoad)
    nextMap.on('styledata', handleStyleData)
    nextMap.on('sourcedata', handleStyleData)
    nextMap.on('idle', handleStyleData)
    nextMap.on('remove', handleMapRemove)
    detachMapEvents = () => {
      nextMap.off('style.load', handleStyleLoad)
      nextMap.off('styledata', handleStyleData)
      nextMap.off('sourcedata', handleStyleData)
      nextMap.off('idle', handleStyleData)
      nextMap.off('remove', handleMapRemove)
    }
    if (nextMap.isStyleLoaded()) {
      handleStyleLoad()
    }
  }

  createEffect(
    () => ({
      map: ctx.map,
      loaded: ctx.loaded,
      resolvedMode: ctx.resolvedMode,
      points: deep(props.points),
      onclick: props.onclick,
      onclusterclick: props.onclusterclick,
      clusterRadius: props.clusterRadius ?? 50,
      clusterMaxZoom: props.clusterMaxZoom ?? 14,
      showUnclustered: props.showUnclustered ?? true,
      onunclusteredchange: props.onunclusteredchange,
      onclusterloadingchange: props.onclusterloadingchange,
    }),
    next => {
      const pointsChanged = !stateInitialized || points !== next.points
      const configChanged =
        !stateInitialized ||
        clusterRadius !== next.clusterRadius ||
        clusterMaxZoom !== next.clusterMaxZoom ||
        showUnclustered !== next.showUnclustered
      const clusterStateEventsChanged =
        !stateInitialized || Boolean(onunclusteredchange) !== Boolean(next.onunclusteredchange)
      const modeChanged = !stateInitialized || resolvedMode !== next.resolvedMode

      pendingMap = next.map
      loaded = next.loaded
      resolvedMode = next.resolvedMode
      points = next.points
      onclick = next.onclick
      onclusterclick = next.onclusterclick
      clusterRadius = next.clusterRadius
      clusterMaxZoom = next.clusterMaxZoom
      showUnclustered = next.showUnclustered
      onunclusteredchange = next.onunclusteredchange
      onclusterloadingchange = next.onclusterloadingchange
      stateInitialized = true

      if (pointsChanged) {
        updatePointsLookup()
      }
      if (configChanged) {
        supercluster = null
        lastSuperclusterPointsKey = ''
      }
      if (pointsChanged || configChanged) {
        pendingDataUpdate = true
      }
      if (modeChanged || configChanged) {
        pendingThemeUpdate = true
      }
      if (settled) {
        connectMap(pendingMap)
      }
      if (!map) {
        return
      }
      if (clusterStateEventsChanged) {
        attachClusterStateEvents(map)
      }
      applyPendingUpdates()
    },
  )

  onSettled(() => {
    settled = true
    connectMap(pendingMap)
    return () => {
      settled = false
      disconnectMap()
    }
  })

  return null
}
