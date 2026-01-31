import type maplibregl from 'maplibre-gl'
import { getContext, setContext } from 'svelte'

const MAP_CONTEXT_KEY = Symbol('shadcn-map-context')

export interface MarkerRegistration {
  id: string
  lngLat: [number, number]
  clusterable: boolean
}

export interface MapContextStore {
  readonly map: maplibregl.Map | null
  readonly loaded: boolean
  readonly markers: Map<string, MarkerRegistration>
  readonly clusteredMarkerIds: Set<string>
  readonly clusteredVersion: number
  setMap: (map: maplibregl.Map | null) => void
  setLoaded: (loaded: boolean) => void
  registerMarker: (registration: MarkerRegistration) => void
  updateMarker: (id: string, updates: Partial<MarkerRegistration>) => void
  unregisterMarker: (id: string) => void
  setClusteredMarkers: (ids: Set<string>) => void
}

export function createMapContext(): MapContextStore {
  let map = $state<maplibregl.Map | null>(null)
  let loaded = $state(false)
  let markers = $state(new Map<string, MarkerRegistration>())
  let clusteredMarkerIds = $state(new Set<string>())
  let clusteredVersion = $state(0)

  const store: MapContextStore = {
    get map() { return map },
    get loaded() { return loaded },
    get markers() { return markers },
    get clusteredMarkerIds() { return clusteredMarkerIds },
    get clusteredVersion() { return clusteredVersion },
    setMap: (m) => { map = m },
    setLoaded: (l) => { loaded = l },
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
      if (!lngLatChanged && !clusterableChanged) {
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
