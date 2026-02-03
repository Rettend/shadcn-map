<script lang='ts' module>
  export interface ClusterPoint {
    /** Unique identifier */
    id: string | number
    /** Position [lng, lat] */
    lngLat: [number, number]
    /** Additional properties */
    properties?: Record<string, unknown>
  }

  export interface ClusterLayerProps {
    /** Array of points to cluster */
    points: ClusterPoint[]
    /** Click callback for individual points */
    onclick?: (point: ClusterPoint) => void
    /** Click callback for clusters */
    onclusterclick?: (clusterId: number, zoom: number) => void
    /** Cluster radius in pixels */
    clusterRadius?: number
    /** Max zoom to cluster at */
    clusterMaxZoom?: number
    /** Whether to render unclustered points */
    showUnclustered?: boolean
    /** Callback with unclustered point ids */
    onunclusteredchange?: (ids: Set<string>) => void
    /** Callback when cluster source is loading */
    onclusterloadingchange?: (loading: boolean) => void
  }
</script>

<script lang='ts'>
  import type { GeoJSONSource, MapLayerMouseEvent, MapLibreMap } from '../types'
  import Supercluster from 'supercluster'
  import { onMount } from 'svelte'
  import { getMapContext } from '../context.svelte'

  const {
    points,
    onclick,
    onclusterclick,
    clusterRadius = 50,
    clusterMaxZoom = 14,
    showUnclustered = true,
    onunclusteredchange,
    onclusterloadingchange,
  }: ClusterLayerProps = $props()

  const ctx = getMapContext()

  const instanceId = `shadcn-cluster-${Math.random().toString(36).slice(2)}`
  const sourceId = `${instanceId}-source`
  const clusterLayerId = `${instanceId}-cluster`
  const clusterCountId = `${instanceId}-count`
  const unclusteredLayerId = `${instanceId}-point`

  let map: MapLibreMap | null = null
  let pointsById = new Map<string, ClusterPoint>()
  let detachEvents: (() => void) | null = null
  let lastConfigKey = ''
  let unclusteredUpdateScheduled = false
  let lastUnclusteredKey = '__initial__'
  let pointsKey = ''
  let detachClusterStateEvents: (() => void) | null = null
  let clusterLoading = false

  let supercluster: Supercluster<{ id: string | number }, Supercluster.AnyProps> | null = null
  let lastSuperclusterPointsKey = ''

  function getThemeColors() {
    const isDark = ctx.resolvedMode === 'dark'
    return isDark
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

  type ClusterFeatureCollection = {
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
          id: point.id,
          ...point.properties,
        },
      })),
    }
  }

  function updatePointsLookup() {
    pointsById = new Map(points.map(point => [String(point.id), point]))
    const nextPointsKey = points.map(point => String(point.id)).sort().join('|')
    if (nextPointsKey !== pointsKey) {
      pointsKey = nextPointsKey
      lastUnclusteredKey = '__initial__'
    }
  }

  function updateSourceData() {
    const source = map?.getSource(sourceId) as GeoJSONSource | undefined
    if (!source) {
      return
    }
    source.setData(buildGeoJSON())
  }

  function buildUnclusteredKey(ids: Set<string>) {
    if (ids.size === 0) {
      return ''
    }
    return Array.from(ids).sort().join('|')
  }

  function setClusterLoading(next: boolean) {
    if (clusterLoading === next) {
      return
    }
    clusterLoading = next
    onclusterloadingchange?.(next)
  }

  function ensureSupercluster() {
    const currentPointsKey = points.map(p => `${p.id}:${p.lngLat[0]},${p.lngLat[1]}`).join('|')
    if (supercluster && currentPointsKey === lastSuperclusterPointsKey) {
      return
    }

    supercluster = new Supercluster({
      radius: clusterRadius,
      maxZoom: clusterMaxZoom,
      extent: 512,
      map: props => ({ id: props.id }),
      reduce: (acc, props) => { acc.id = props.id },
    })

    const features = points.map(point => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: point.lngLat as [number, number],
      },
      properties: { id: point.id },
    }))

    supercluster.load(features)
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

    const currentZoom = Math.floor(map.getZoom())

    const clusters = supercluster.getClusters([-180, -90, 180, 90], currentZoom)

    const ids = new Set<string>()
    for (const feature of clusters) {
      const props = feature.properties
      if (!('cluster' in props) || !props.cluster) {
        const id = (props as { id?: string | number }).id
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
      emitUnclusteredIds()
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run)
    }
    else {
      setTimeout(run, 0)
    }
  }

  function attachClusterStateEvents(currentMap: MapLibreMap) {
    if (!onunclusteredchange) {
      return
    }
    detachClusterStateEvents?.()

    const handleZoomChange = () => {
      emitUnclusteredIds()
    }

    const handleViewChange = () => {
      scheduleUnclusteredUpdate()
    }

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

    const handleClusterClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const clusterId = Number(feature?.properties?.cluster_id)
      if (!Number.isFinite(clusterId)) {
        return
      }

      const source = currentMap.getSource(sourceId) as GeoJSONSource | undefined
      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)?.coordinates
      if (!source || !coordinates) {
        return
      }

      Promise.resolve(source.getClusterExpansionZoom(clusterId))
        .then((zoom) => {
          const center = coordinates as [number, number]
          currentMap.easeTo({ center, zoom })
          onclusterclick?.(clusterId, zoom)
        })
        .catch(() => {})
    }

    const handlePointClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const id = feature?.properties?.id
      const point = pointsById.get(String(id))
      if (point) {
        onclick?.(point)
        return
      }

      const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)?.coordinates
      if (!coordinates) {
        return
      }

      onclick?.({
        id: id ?? `${coordinates[0]}-${coordinates[1]}`,
        lngLat: coordinates as [number, number],
        properties: { ...feature?.properties },
      })
    }

    const handleMouseEnter = () => {
      currentMap.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      currentMap.getCanvas().style.cursor = ''
    }

    currentMap.on('click', clusterLayerId, handleClusterClick)
    if (showUnclustered) {
      currentMap.on('click', unclusteredLayerId, handlePointClick)
    }
    currentMap.on('mouseenter', clusterLayerId, handleMouseEnter)
    currentMap.on('mouseleave', clusterLayerId, handleMouseLeave)
    if (showUnclustered) {
      currentMap.on('mouseenter', unclusteredLayerId, handleMouseEnter)
      currentMap.on('mouseleave', unclusteredLayerId, handleMouseLeave)
    }

    detachEvents = () => {
      currentMap.off('click', clusterLayerId, handleClusterClick)
      if (showUnclustered) {
        currentMap.off('click', unclusteredLayerId, handlePointClick)
      }
      currentMap.off('mouseenter', clusterLayerId, handleMouseEnter)
      currentMap.off('mouseleave', clusterLayerId, handleMouseLeave)
      if (showUnclustered) {
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
    currentMap.setPaintProperty(clusterCountId, 'text-opacity-transition', { duration: 0, delay: 0 })
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
    detachEvents?.()
    detachEvents = null

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

  onMount(() => {
    map = ctx.map
    if (!map) {
      return
    }

    updatePointsLookup()
    attachClusterStateEvents(map)

    const handleStyleLoad = () => {
      lastConfigKey = ''
      lastUnclusteredKey = '__initial__'
      setClusterLoading(true)
      ensureLayers()
      updateSourceData()
      scheduleUnclusteredUpdate()
    }

    const handleStyleData = () => {
      if (!map || !map.isStyleLoaded()) {
        return
      }
      if (!map.getSource(sourceId)) {
        handleStyleLoad()
      }
    }

    map.on('style.load', handleStyleLoad)
    map.on('styledata', handleStyleData)

    if (map.isStyleLoaded()) {
      handleStyleLoad()
    }

    return () => {
      map?.off('style.load', handleStyleLoad)
      map?.off('styledata', handleStyleData)
      detachClusterStateEvents?.()
      detachClusterStateEvents = null
      if (map) {
        removeLayers(map)
      }
      map = null
    }
  })

  // Explicitly read points to track as dependency
  const pointsArray = $derived(points)

  $effect(() => {
    // Access pointsArray to ensure dependency tracking
    void pointsArray
    if (!map || !ctx.loaded) {
      return
    }

    updatePointsLookup()
    ensureLayers()
    updateSourceData()
    scheduleUnclusteredUpdate()
  })

  // Update cluster colors when resolvedMode changes
  $effect(() => {
    // Access resolvedMode to track as dependency
    void ctx.resolvedMode
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const colors = getThemeColors()

    // Update cluster layer colors
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

    // Update cluster count text color
    if (map.getLayer(clusterCountId)) {
      map.setPaintProperty(clusterCountId, 'text-color', colors.clusterText)
    }

    // Update unclustered point colors
    if (showUnclustered && map.getLayer(unclusteredLayerId)) {
      map.setPaintProperty(unclusteredLayerId, 'circle-color', colors.point)
      map.setPaintProperty(unclusteredLayerId, 'circle-stroke-color', colors.pointStroke)
    }
  })
</script>
