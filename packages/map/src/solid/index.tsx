import './styles.css'

export { colors, createDarkStyle, createLightStyle, darkStyle, lightStyle } from '../shared/styles'
export { themeColorTokens } from '../shared/theme'
export type { ThemeColorToken } from '../shared/theme'
export type {
  BadgePosition,
  ControlPosition,
  LabelMode,
  MapContext,
  MapLibreMap,
  MarkerBadge,
  MarkerColor,
  MarkerIcon,
  MarkerIconValue,
  MarkerSize,
  StyleMode,
  StyleSpecification,
} from '../shared/types'
export type { ClusterLayerProps, ClusterPoint } from './components/ClusterLayer'
export { ClusterLayer } from './components/ClusterLayer'
export type { GeolocateControlProps } from './components/controls/GeolocateControl'
export { GeolocateControl } from './components/controls/GeolocateControl'
export type { NavigationControlProps } from './components/controls/NavigationControl'
export { NavigationControl } from './components/controls/NavigationControl'
export type { ScaleControlProps } from './components/controls/ScaleControl'
export { ScaleControl } from './components/controls/ScaleControl'
export type { DetailsPanelProps } from './components/DetailsPanel'
export { DetailsPanel } from './components/DetailsPanel'
export type { MapProps } from './components/Map'
export { Map } from './components/Map'
export type { MarkerProps } from './components/Marker'
export { Marker } from './components/Marker'

export type {
  MarkerLayerIcon,
  MarkerLayerIconValue,
  MarkerLayerPoint,
  MarkerLayerProps,
} from './components/MarkerLayer'
export { MarkerLayer } from './components/MarkerLayer'

export type { PopupProps } from './components/Popup'
export { Popup } from './components/Popup'
export { createMapContext, getMapContext, MapContextProvider } from './context'
export type { FlyToOptions, LngLatBounds, MapContextStore, MarkerRegistration } from './context'
