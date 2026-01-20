import type maplibregl from 'maplibre-gl'
import { getContext, setContext } from 'svelte'

const MAP_CONTEXT_KEY = Symbol('shadcn-map-context')

export interface MapContextStore {
  readonly map: maplibregl.Map | null
  readonly loaded: boolean
  setMap: (map: maplibregl.Map | null) => void
  setLoaded: (loaded: boolean) => void
}

export function createMapContext(): MapContextStore {
  let map = $state<maplibregl.Map | null>(null)
  let loaded = $state(false)

  const store: MapContextStore = {
    get map() { return map },
    get loaded() { return loaded },
    setMap: (m) => { map = m },
    setLoaded: (l) => { loaded = l },
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
