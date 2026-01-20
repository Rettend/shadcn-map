export type { MapProps, MarkerProps, NavigationControlProps, ScaleControlProps } from './components'
export { Map, Marker, NavigationControl, ScaleControl } from './components'

export { createMapContext, getMapContext, type MapContextStore } from './context.svelte'

export { colors, createDarkStyle, createLightStyle, darkStyle, lightStyle } from './styles'
export { type ThemeColorToken, themeColorTokens } from './theme'

export type {
  ClusterLayerProps,
  ClusterPoint,
  ControlPosition,
  MapContext,
  MapLibreMap,
  MarkerColor,
  MarkerSize,
  StyleMode,
  StyleSpecification,
} from './types'
