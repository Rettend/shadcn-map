import type { LngLatLike, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'

/**
 * Position type for map controls
 */
export type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Style mode for the map
 */
export type StyleMode = 'auto' | 'dark' | 'light'

/**
 * Marker variant types matching shadcn color scheme
 */
export type MarkerVariant = 'default' | 'primary' | 'destructive' | 'success' | 'warning'

/**
 * Marker size options
 */
export type MarkerSize = 'sm' | 'md' | 'lg'

/**
 * Map component props
 */
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
  /** Map style: 'auto' uses mode-watcher, or specify 'dark'/'light'/custom StyleSpec */
  style?: StyleMode | StyleSpecification
  /** URL to PMTiles file (required) */
  tiles: string
  /** Enable map interactions (pan, zoom) */
  interactive?: boolean
  /** Additional CSS classes */
  class?: string
  /** Callback when map is fully loaded */
  onload?: (map: MapLibreMap) => void
  /** Callback when map is clicked */
  onclick?: (e: { lngLat: [number, number], point: { x: number, y: number } }) => void
  /** Callback when camera moves */
  onmove?: (e: { center: [number, number], zoom: number }) => void
  /** Callback when zoom changes */
  onzoom?: (zoom: number) => void
}

/**
 * Marker component props
 */
export interface MarkerProps {
  /** Marker position [lng, lat] */
  lngLat: [number, number]
  /** Color variant */
  variant?: MarkerVariant
  /** Size */
  size?: MarkerSize
  /** Show pulse animation */
  pulse?: boolean
  /** Label shown on hover */
  label?: string
  /** Allow dragging */
  draggable?: boolean
  /** Additional CSS classes */
  class?: string
  /** Click callback */
  onclick?: () => void
  /** Drag end callback */
  ondragend?: (lngLat: [number, number]) => void
}

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
 * Navigation control props
 */
export interface NavigationControlProps {
  /** Control position on map */
  position?: ControlPosition
  /** Show compass */
  showCompass?: boolean
  /** Show zoom buttons */
  showZoom?: boolean
}

/**
 * Scale control props
 */
export interface ScaleControlProps {
  /** Control position on map */
  position?: ControlPosition
  /** Unit of measurement */
  unit?: 'imperial' | 'metric' | 'nautical'
  /** Maximum width in pixels */
  maxWidth?: number
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

export type { LngLatLike, MapLibreMap, StyleSpecification }
