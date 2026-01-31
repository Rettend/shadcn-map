import type { GeoJSONSource, MapLayerMouseEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { ThemeColorToken } from './theme'

export type { GeoJSONSource, MapLayerMouseEvent, MapLibreMap, StyleSpecification }

/**
 * Position type for map controls
 */
export type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Style mode for the map
 */
export type StyleMode = 'auto' | 'dark' | 'light'

/**
 * Marker color tokens matching shadcn theme CSS vars
 */
export type MarkerColor = ThemeColorToken

/**
 * Marker size options
 */
export type MarkerSize = 'sm' | 'md' | 'lg'

/**
 * Map context type for child components
 * @deprecated Use MapContextStore from context.ts instead
 */
export interface MapContext {
  /** Get the MapLibre GL map instance */
  getMap: () => MapLibreMap | null
  /** Check if map is loaded */
  isLoaded: () => boolean
  /** Set the map instance (internal use) */
  setMap: (map: MapLibreMap | null) => void
  /** Set loaded state (internal use) */
  setLoaded: (loaded: boolean) => void
}
