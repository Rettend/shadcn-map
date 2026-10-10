import type { JSX } from '@solidjs/web'
import type { LabelMode, MapLibreMap, StyleMode, StyleSpecification } from '../../shared/types'
import { isServer } from '@solidjs/web'
import { addProtocol, Map as MapLibre, removeProtocol } from 'maplibre-gl'
import { FetchSource, PMTiles, Protocol } from 'pmtiles'
import { createEffect, createMemo, createSignal, deep, onSettled, Show, snapshot } from 'solid-js'
import { createDarkStyle } from '../../shared/styles/dark'
import { createLightStyle } from '../../shared/styles/light'
import { createMapContext, MapContext } from '../context'
import { ClusterLayer } from './ClusterLayer'

interface PmtilesProtocolState {
  protocol: Protocol
  users: number
}

const globalWithPmtilesRegistry = globalThis as typeof globalThis & {
  __shadcnMapPmtilesProtocols?: WeakMap<object, PmtilesProtocolState>
}
const pmtilesProtocolRegistry = (globalWithPmtilesRegistry.__shadcnMapPmtilesProtocols ??=
  new WeakMap<object, PmtilesProtocolState>())
const maplibreRegistryKey = addProtocol

function getSharedPmtilesState(): PmtilesProtocolState {
  const existing = pmtilesProtocolRegistry.get(maplibreRegistryKey)
  if (existing) {
    return existing
  }
  const created = { protocol: new Protocol(), users: 0 }
  pmtilesProtocolRegistry.set(maplibreRegistryKey, created)
  return created
}

const sharedPmtilesState = getSharedPmtilesState()

function ensurePmtilesSource(tiles: string) {
  const source = new FetchSource(tiles)
  if (!sharedPmtilesState.protocol.get(source.getKey())) {
    const sourceWithCacheFlags = source as FetchSource & {
      chromeWindowsNoCache?: boolean
    }
    sourceWithCacheFlags.chromeWindowsNoCache = true
    sharedPmtilesState.protocol.add(new PMTiles(source))
  }
}

function registerPmtiles(tiles: string) {
  ensurePmtilesSource(tiles)
  if (sharedPmtilesState.users === 0) {
    addProtocol('pmtiles', sharedPmtilesState.protocol.tile)
  }
  sharedPmtilesState.users += 1
}

function unregisterPmtiles() {
  if (sharedPmtilesState.users === 0) {
    return
  }

  sharedPmtilesState.users -= 1
  if (sharedPmtilesState.users === 0) {
    removeProtocol('pmtiles')
    sharedPmtilesState.protocol.tiles.clear()
  }
}

export interface MapProps {
  /** Initial center coordinates [lng, lat] */
  center?: [number, number]
  /** Initial zoom level (0-20) */
  zoom?: number
  /** Minimum zoom allowed */
  minZoom?: number
  /** Maximum zoom allowed */
  maxZoom?: number
  /** Camera pitch (3D tilt) in degrees */
  pitch?: number
  /** Camera rotation in degrees */
  bearing?: number
  /** Map style: 'auto' follows the document .dark class, or specify 'dark'/'light'/custom StyleSpec */
  style?: StyleMode | StyleSpecification
  /** Built-in label density preset (only applies to built-in dark/light/auto styles) */
  labels?: LabelMode
  /** URL to PMTiles file (required) */
  tiles: string
  /** Enable map interactions (pan, zoom) */
  interactive?: boolean
  /** Allow rotation with mouse drag */
  dragRotate?: boolean
  /** Use cursor-relative orbital rotation instead of linear horizontal rotation. Defaults to false. */
  aroundCenter?: boolean
  /** Allow pitch (tilt) gestures on touch */
  touchPitch?: boolean
  /** Allow pinch zoom + rotate on touch */
  touchZoomRotate?: boolean
  /** Allow pitch while drag-rotating with mouse */
  pitchWithRotate?: boolean
  /** Additional CSS classes */
  class?: string
  /** Callback when map is fully loaded */
  onload?: (map: MapLibreMap) => void
  /** Callback when the map background is clicked. */
  onclick?: (event: { lngLat: [number, number]; point: { x: number; y: number } }) => void
  /** Callback when camera moves */
  onmove?: (event: { center: [number, number]; zoom: number }) => void
  /** Callback when camera movement finishes */
  onmoveend?: (event: { center: [number, number]; zoom: number }) => void
  /** Callback when zoom changes */
  onzoom?: (zoom: number) => void
  /** Children */
  children?: JSX.Element
  /** Automatically cluster registered markers */
  autoCluster?: boolean
  /** Cluster radius in pixels for auto clustering */
  autoClusterRadius?: number
  /** Max zoom to cluster at for auto clustering */
  autoClusterMaxZoom?: number
}

export function Map(props: MapProps): JSX.Element {
  let container: HTMLDivElement | undefined

  function getIsDarkMode(): boolean {
    if (isServer) {
      return true
    }
    return document.documentElement.matches('.dark')
  }

  const [documentIsDark, setDocumentIsDark] = createSignal(getIsDarkMode())
  const resolvedMode = createMemo((): 'dark' | 'light' => {
    const style = props.style ?? 'auto'
    if (typeof style === 'object') {
      return 'dark'
    }
    if (style === 'auto') {
      return documentIsDark() ? 'dark' : 'light'
    }
    return style
  })

  function resolveStyle(
    style: StyleMode | StyleSpecification,
    mode: 'dark' | 'light',
    tiles: string,
    labels: LabelMode,
  ) {
    if (typeof style === 'object') {
      return style
    }

    return mode === 'dark'
      ? createDarkStyle(tiles, { labels })
      : createLightStyle(tiles, { labels })
  }

  const styleOptions = createMemo(() => {
    const style = props.style ?? 'auto'
    return {
      style: typeof style === 'object' ? deep(style) : style,
      mode: resolvedMode(),
      tiles: props.tiles,
      labels: props.labels ?? 'minimal',
    }
  })

  const ctx = createMapContext(resolvedMode)

  const autoClusterPoints = createMemo(() => {
    if (!(props.autoCluster ?? false)) {
      return []
    }

    return Array.from(ctx.markers.values())
      .filter(marker => marker.clusterable)
      .map(marker => ({
        id: marker.id,
        lngLat: marker.lngLat,
      }))
  })

  function handleAutoClusterUnclustered(unclusteredIds: Set<string>) {
    const clusteredIds = new Set(
      autoClusterPoints()
        .map(point => String(point.id))
        .filter(id => !unclusteredIds.has(id)),
    )
    ctx.setClusteredMarkers(clusteredIds)
  }

  const [mapError, setMapError] = createSignal<string | null>(null)
  let appliedStyle: ReturnType<typeof styleOptions> | undefined

  createEffect(
    () => ({
      map: ctx.map,
      options: styleOptions(),
    }),
    ({ map, options }) => {
      if (!map || options === appliedStyle) {
        return
      }
      ensurePmtilesSource(options.tiles)
      map.setStyle(resolveStyle(options.style, options.mode, options.tiles, options.labels))
      appliedStyle = options
    },
  )

  function checkWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!canvas.getContext('webgl2')
    } catch {
      return false
    }
  }

  createEffect(
    () => props.autoCluster ?? false,
    autoCluster => {
      if (!autoCluster) {
        ctx.setClusteredMarkers(new Set())
      }
    },
  )

  if (!isServer) {
    onSettled(() => {
      if (!checkWebGL2()) {
        const error = 'WebGL2 is not available in this browser. The map requires WebGL2 to render.'
        setMapError(error)
        console.error('[shadcn-map]', error)
        return
      }

      const options = styleOptions()
      registerPmtiles(options.tiles)

      let mapInstance: MapLibreMap
      try {
        mapInstance = new MapLibre({
          container: container!,
          style: resolveStyle(options.style, options.mode, options.tiles, options.labels),
          center: props.center ? snapshot(props.center) : [0, 0],
          zoom: props.zoom ?? 10,
          minZoom: props.minZoom ?? 0,
          maxZoom: props.maxZoom ?? 20,
          pitch: props.pitch ?? 0,
          bearing: props.bearing ?? 0,
          interactive: props.interactive ?? true,
          dragRotate: props.dragRotate ?? true,
          aroundCenter: props.aroundCenter ?? false,
          touchPitch: props.touchPitch ?? true,
          touchZoomRotate: props.touchZoomRotate ?? true,
          pitchWithRotate: props.pitchWithRotate ?? true,
          fadeDuration: 0,
        })
      } catch (error) {
        unregisterPmtiles()
        const message = `Map initialization failed: ${error instanceof Error ? error.message : error}`
        setMapError(message)
        console.error('[shadcn-map]', message)
        return
      }

      appliedStyle = options
      ctx.setMap(mapInstance)
      let mapRemoved = false
      mapInstance.on('remove', () => {
        mapRemoved = true
      })

      mapInstance.on('load', () => {
        ctx.setLoaded(true)
        props.onload?.(mapInstance)
      })

      mapInstance.on('error', event => {
        console.error('[shadcn-map] Map error:', event.error?.message || event)
      })

      mapInstance.on('click', event => {
        // Delegated layer listeners share this event and may run after us.
        // Wait for native dispatch to finish before forwarding a background click.
        queueMicrotask(() => {
          if (mapRemoved || event.defaultPrevented) {
            return
          }
          props.onclick?.({
            lngLat: [event.lngLat.lng, event.lngLat.lat],
            point: { x: event.point.x, y: event.point.y },
          })
        })
      })

      mapInstance.on('move', () => {
        if (!props.onmove) {
          return
        }
        const center = mapInstance.getCenter()
        props.onmove({
          center: [center.lng, center.lat],
          zoom: mapInstance.getZoom(),
        })
      })

      mapInstance.on('moveend', () => {
        if (!props.onmoveend) {
          return
        }
        const center = mapInstance.getCenter()
        props.onmoveend({
          center: [center.lng, center.lat],
          zoom: mapInstance.getZoom(),
        })
      })

      mapInstance.on('zoom', () => {
        props.onzoom?.(mapInstance.getZoom())
      })

      const observer = new MutationObserver(() => {
        setDocumentIsDark(getIsDarkMode())
      })

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })

      return () => {
        mapRemoved = true
        observer.disconnect()
        ctx.setMap(null)
        ctx.setLoaded(false)
        try {
          mapInstance.remove()
        } finally {
          unregisterPmtiles()
        }
      }
    })
  }

  return (
    <MapContext value={ctx}>
      <div
        ref={element => {
          container = element
        }}
        class={['shadcn-map', props.class]}
        data-map-mode={resolvedMode()}
      >
        <Show when={mapError()}>
          <div class="shadcn-map-error">
            <div class="shadcn-map-error-content">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{mapError()}</p>
            </div>
          </div>
        </Show>
        <Show when={ctx.loaded}>
          <Show when={props.autoCluster ?? false}>
            <ClusterLayer
              points={autoClusterPoints()}
              clusterRadius={props.autoClusterRadius ?? 50}
              clusterMaxZoom={props.autoClusterMaxZoom ?? 14}
              showUnclustered={false}
              onunclusteredchange={handleAutoClusterUnclustered}
            />
          </Show>
          {props.children}
        </Show>
      </div>
    </MapContext>
  )
}

export default Map
