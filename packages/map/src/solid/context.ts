import type { Map as MapLibreMap } from 'maplibre-gl'
import { createContext, createSignal, useContext } from 'solid-js'

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
  readonly map: MapLibreMap | null
  readonly loaded: boolean
  readonly markers: Map<string, MarkerRegistration>
  readonly clusteredMarkerIds: Set<string>
  readonly clusteredVersion: number
  readonly activePopupMarkerId: string | null
  /** The resolved theme mode for the map ('dark' or 'light') */
  readonly resolvedMode: 'dark' | 'light'
  setMap: (map: MapLibreMap | null) => void
  setLoaded: (loaded: boolean) => void
  registerMarker: (registration: MarkerRegistration) => void
  updateMarker: (id: string, updates: Partial<MarkerRegistration>) => void
  unregisterMarker: (id: string) => void
  setClusteredMarkers: (ids: Set<string>) => void
  setActivePopupMarker: (id: string | null) => void
  clearActivePopupMarker: (id: string) => void
  setPopupMarker: (owner: symbol, id: string) => void
  clearPopupMarker: (owner: symbol) => void
  setResolvedMode: (mode: 'dark' | 'light') => void
  flyTo: (lngLat: [number, number], options?: FlyToOptions) => void
  getBounds: () => LngLatBounds | null
  getCenter: () => [number, number] | null
  getZoom: () => number | null
}

export const MapContext = createContext<MapContextStore>()
export const MapContextProvider = MapContext

export function createMapContext(mode: () => 'dark' | 'light' = () => 'dark'): MapContextStore {
  // Imperative helpers use the native instance immediately; reactive reads stay staged.
  let currentMap: MapLibreMap | null = null
  const [map, setMapSignal] = createSignal<MapLibreMap | null>(null)
  const [loaded, setLoaded] = createSignal(false)
  const [markers, setMarkers] = createSignal(new Map<string, MarkerRegistration>())
  const [clusteredMarkerIds, setClusteredMarkerIds] = createSignal(new Set<string>())
  const [clusteredVersion, setClusteredVersion] = createSignal(0)
  const [activePopupMarkerId, setActivePopupMarkerId] = createSignal<string | null>(null)
  const [resolvedMode, setResolvedMode] = createSignal(mode)
  const popupMarkers = new Map<symbol, string>()

  const updateActivePopupMarker = () => {
    const ids = Array.from(popupMarkers.values())
    setActivePopupMarkerId(ids.at(-1) ?? null)
  }

  return {
    get map() {
      return map()
    },
    get loaded() {
      return loaded()
    },
    get markers() {
      return markers()
    },
    get clusteredMarkerIds() {
      return clusteredMarkerIds()
    },
    get clusteredVersion() {
      return clusteredVersion()
    },
    get activePopupMarkerId() {
      return activePopupMarkerId()
    },
    get resolvedMode() {
      return resolvedMode()
    },
    setMap: nextMap => {
      currentMap = nextMap
      setMapSignal(nextMap)
    },
    setLoaded: nextLoaded => {
      setLoaded(nextLoaded)
    },
    setResolvedMode: nextMode => {
      setResolvedMode(nextMode)
    },
    registerMarker: registration => {
      setMarkers(current => {
        const next = new Map(current)
        next.set(registration.id, registration)
        return next
      })
    },
    updateMarker: (id, updates) => {
      setMarkers(current => {
        const existing = current.get(id)
        if (!existing) {
          return current
        }

        const nextEntry = { ...existing, ...updates }
        const lngLatChanged =
          existing.lngLat[0] !== nextEntry.lngLat[0] || existing.lngLat[1] !== nextEntry.lngLat[1]
        const clusterableChanged = existing.clusterable !== nextEntry.clusterable
        const sizeChanged = existing.size !== nextEntry.size
        if (!lngLatChanged && !clusterableChanged && !sizeChanged) {
          return current
        }

        const next = new Map(current)
        next.set(id, nextEntry)
        return next
      })
    },
    unregisterMarker: id => {
      setMarkers(current => {
        const next = new Map(current)
        next.delete(id)
        return next
      })
    },
    setClusteredMarkers: ids => {
      setClusteredMarkerIds(new Set(ids))
      setClusteredVersion(version => version + 1)
    },
    setActivePopupMarker: id => {
      setActivePopupMarkerId(id)
    },
    clearActivePopupMarker: id => {
      setActivePopupMarkerId(current => (current === id ? null : current))
    },
    setPopupMarker: (owner, id) => {
      popupMarkers.delete(owner)
      popupMarkers.set(owner, id)
      updateActivePopupMarker()
    },
    clearPopupMarker: owner => {
      if (popupMarkers.delete(owner)) {
        updateActivePopupMarker()
      }
    },
    flyTo: (lngLat, options) => {
      const mapInstance = currentMap
      if (!mapInstance) {
        return
      }

      mapInstance.easeTo({
        center: lngLat,
        zoom: options?.zoom,
        duration: options?.duration,
        easing: options?.easing,
      })
    },
    getBounds: () => {
      const mapInstance = currentMap
      if (!mapInstance) {
        return null
      }

      const bounds = mapInstance.getBounds()
      return {
        sw: [bounds.getWest(), bounds.getSouth()],
        ne: [bounds.getEast(), bounds.getNorth()],
      }
    },
    getCenter: () => {
      const mapInstance = currentMap
      if (!mapInstance) {
        return null
      }

      const center = mapInstance.getCenter()
      return [center.lng, center.lat]
    },
    getZoom: () => {
      const mapInstance = currentMap
      if (!mapInstance) {
        return null
      }
      return mapInstance.getZoom()
    },
  }
}

export function getMapContext(): MapContextStore {
  return useContext(MapContext)
}
