// Import maplibregl type
import type maplibregl from 'maplibre-gl'

import { getContext, setContext } from 'svelte'

const MAP_CONTEXT_KEY = Symbol('shadcn-map-context')

/**
 * Map context store using Svelte 5 $state runes
 */
export interface MapContextStore {
  readonly map: maplibregl.Map | null
  readonly loaded: boolean
  setMap: (map: maplibregl.Map | null) => void
  setLoaded: (loaded: boolean) => void
}

/**
 * Create and set the map context (called by Map component)
 * Uses Svelte 5 $state runes for reactivity
 */
export function createMapContext(): MapContextStore {
  // Using $state runes - this works because we're in a .svelte.ts file
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

/**
 * Get the map context store (called by child components)
 * Safe to call during component init
 */
export function getMapContext(): MapContextStore {
  const context = getContext<MapContextStore>(MAP_CONTEXT_KEY)
  if (!context) {
    throw new Error(
      'getMapContext must be called within a <Map> component. '
      + 'Make sure your component is a child of <Map>.',
    )
  }
  return context
}
