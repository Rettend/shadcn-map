import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { ThemeColorToken } from './theme'

export type { MapLibreMap, StyleSpecification }

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
 * Popup component props
 */
export interface PopupProps {
  /** Popup position [lng, lat] */
  lngLat: [number, number]
  /** Whether popup is visible */
  open?: boolean
  /** Close callback */
  onclose?: () => void
  /** Additional CSS classes */
  class?: string
  /** Offset from anchor point */
  offset?: number | [number, number]
}

/**
 * Point data for cluster layer
 */
export interface ClusterPoint {
  /** Unique identifier */
  id: string | number
  /** Position [lng, lat] */
  lngLat: [number, number]
  /** Additional properties */
  properties?: Record<string, unknown>
}

/**
 * Cluster layer props
 */
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
