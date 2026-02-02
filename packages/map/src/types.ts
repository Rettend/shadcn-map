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
 * Label density preset for built-in styles
 */
export type LabelMode = 'minimal' | 'roads'

/**
 * Marker color tokens matching shadcn theme CSS vars
 */
export type MarkerColor = ThemeColorToken

/**
 * Marker size options
 */
export type MarkerSize = 'sm' | 'md' | 'lg'

/**
 * Badge position on a marker
 */
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

/**
 * Badge shown on markers for additional indicators
 */
export interface MarkerBadge {
  /** Iconify icon class (e.g. 'i-ph:credit-card') */
  icon: string
  /** Background color (UnoCSS class like 'bg-green-500') */
  color?: string
  /** Icon/text color (UnoCSS class, defaults to 'text-white') */
  textColor?: string
  /** Tooltip shown on hover */
  label?: string
  /** Position on the marker (defaults to 'top-right') */
  position?: BadgePosition
}

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
