// Import maplibregl type
import type maplibregl from 'maplibre-gl'
import type { Writable } from 'svelte/store'
import type { MapContext } from './types'

import { getContext, setContext } from 'svelte'
import { writable } from 'svelte/store'

const MAP_CONTEXT_KEY = Symbol('shadcn-map-context')

/**
 * Internal store type for map context
 */
export interface MapContextStore {
  map: Writable<maplibregl.Map | null>
  loaded: Writable<boolean>
}

/**
 * Create and set the map context (called by Map component)
 */
export function createMapContext(): MapContextStore {
  const store: MapContextStore = {
    map: writable(null),
    loaded: writable(false),
  }
  setContext(MAP_CONTEXT_KEY, store)
  return store
}

/**
 * Get the map context store (called by child components)
 * Returns stores that can be subscribed to - safe to call during init
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

/**
 * Legacy interface for compatibility
 * @deprecated Use createMapContext instead
 */
export function setMapContext(_context: MapContext): void {
  // This is now handled by createMapContext
  console.warn('setMapContext is deprecated, use createMapContext instead')
}
