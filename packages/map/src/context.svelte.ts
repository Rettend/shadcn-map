import type maplibregl from 'maplibre-gl'
import { getContext, setContext } from 'svelte'

const MAP_CONTEXT_KEY = Symbol('shadcn-map-context')

export interface MarkerRegistration {
  id: string
  lngLat: [number, number]
  clusterable: boolean
  size?: 'sm' | 'md' | 'lg'
}

export interface FlyToOptions {
  zoom?: number
  duration?: number
  easing?: (t: number) => number
}

export interface LngLatBounds {
  sw: [number, number]
  ne: [number, number]
}

export interface MapContextStore {
  readonly map: maplibregl.Map | null
  readonly loaded: boolean
  readonly markers: Map<string, MarkerRegistration>
  readonly clusteredMarkerIds: Set<string>
  readonly clusteredVersion: number
  readonly activePopupMarkerId: string | null
  /** The resolved theme mode for the map ('dark' or 'light') */
  readonly resolvedMode: 'dark' | 'light'
  setMap: (map: maplibregl.Map | null) => void
  setLoaded: (loaded: boolean) => void
  registerMarker: (registration: MarkerRegistration) => void
  updateMarker: (id: string, updates: Partial<MarkerRegistration>) => void
  unregisterMarker: (id: string) => void
  setClusteredMarkers: (ids: Set<string>) => void
  setActivePopupMarker: (id: string | null) => void
  setResolvedMode: (mode: 'dark' | 'light') => void
  flyTo: (lngLat: [number, number], options?: FlyToOptions) => void
  getBounds: () => LngLatBounds | null
  getCenter: () => [number, number] | null
  getZoom: () => number | null
}

export function createMapContext(): MapContextStore {
  let map = $state<maplibregl.Map | null>(null)
  let loaded = $state(false)
  let markers = $state(new Map<string, MarkerRegistration>())
  let clusteredMarkerIds = $state(new Set<string>())
  let clusteredVersion = $state(0)
  let activePopupMarkerId = $state<string | null>(null)
  let resolvedMode = $state<'dark' | 'light'>('dark')

  const store: MapContextStore = {
    get map() { return map },
    get loaded() { return loaded },
    get markers() { return markers },
    get clusteredMarkerIds() { return clusteredMarkerIds },
    get clusteredVersion() { return clusteredVersion },
    get activePopupMarkerId() { return activePopupMarkerId },
    get resolvedMode() { return resolvedMode },
    setMap: (m) => { map = m },
    setLoaded: (l) => { loaded = l },
    setResolvedMode: (m) => { resolvedMode = m },
    registerMarker: (registration) => {
      const next = new Map(markers)
      next.set(registration.id, registration)
      markers = next
    },
    updateMarker: (id, updates) => {
      const existing = markers.get(id)
      if (!existing) {
        return
      }
      const nextEntry = { ...existing, ...updates }
      const lngLatChanged = existing.lngLat[0] !== nextEntry.lngLat[0] || existing.lngLat[1] !== nextEntry.lngLat[1]
      const clusterableChanged = existing.clusterable !== nextEntry.clusterable
      const sizeChanged = existing.size !== nextEntry.size
      if (!lngLatChanged && !clusterableChanged && !sizeChanged) {
        return
      }
      const next = new Map(markers)
      next.set(id, nextEntry)
      markers = next
    },
    unregisterMarker: (id) => {
      const next = new Map(markers)
      next.delete(id)
      markers = next
    },
    setClusteredMarkers: (ids) => {
      clusteredMarkerIds = new Set(ids)
      clusteredVersion++
    },
    setActivePopupMarker: (id) => {
      activePopupMarkerId = id
    },
    flyTo: (lngLat, options) => {
      if (!map) {
        return
      }

      map.easeTo({
        center: lngLat,
        zoom: options?.zoom,
        duration: options?.duration,
        easing: options?.easing,
      })
    },
    getBounds: () => {
      if (!map) {
        return null
      }
      const bounds = map.getBounds()
      return {
        sw: [bounds.getWest(), bounds.getSouth()],
        ne: [bounds.getEast(), bounds.getNorth()],
      }
    },
    getCenter: () => {
      if (!map) {
        return null
      }
      const center = map.getCenter()
      return [center.lng, center.lat]
    },
    getZoom: () => {
      if (!map) {
        return null
      }
      return map.getZoom()
    },
  }

  setContext(MAP_CONTEXT_KEY, store)
  return store
}

export function getMapContext(): MapContextStore {
  const context = getContext<MapContextStore>(MAP_CONTEXT_KEY)
  if (!context) {
    throw new Error('getMapContext must be called within a <Map> component. Make sure your component is a child of <Map>.')
  }
  return context
}
