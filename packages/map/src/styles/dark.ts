import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'
import type { LabelMode } from '../types'
import { colors } from './colors'

export interface StyleOptions {
  labels?: LabelMode
}

export function createDarkStyle(tilesUrl: string, options: StyleOptions = {}): StyleSpecification {
  const c = colors.dark
  const labels: LabelMode = options.labels ?? 'minimal'

  const layers: LayerSpecification[] = [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': c.background,
      },
    },
    {
      'id': 'earth',
      'type': 'fill',
      'source': 'protomaps',
      'source-layer': 'earth',
      'paint': {
        'fill-color': c.land,
      },
    },
    {
      'id': 'water',
      'type': 'fill',
      'source': 'protomaps',
      'source-layer': 'water',
      'filter': ['==', '$type', 'Polygon'],
      'paint': {
        'fill-color': c.water,
      },
    },
    {
      'id': 'buildings',
      'type': 'fill',
      'source': 'protomaps',
      'source-layer': 'buildings',
      'minzoom': 14,
      'paint': {
        'fill-color': c.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5],
      },
    },
    {
      'id': 'roads-minor',
      'type': 'line',
      'source': 'protomaps',
      'source-layer': 'roads',
      'filter': ['in', 'kind', 'minor_road', 'other', 'path', 'service', 'track', 'footway', 'cycleway', 'living_street', 'unclassified', 'residential'],
      'minzoom': 10,
      'paint': {
        'line-color': c.roadMinor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 12, 0.5, 16, 2],
      },
    },
    {
      'id': 'roads-major',
      'type': 'line',
      'source': 'protomaps',
      'source-layer': 'roads',
      'filter': ['in', 'kind', 'major_road', 'medium_road'],
      'minzoom': 8,
      'paint': {
        'line-color': c.roadMajor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 2, 16, 4],
      },
    },
    {
      'id': 'roads-highway',
      'type': 'line',
      'source': 'protomaps',
      'source-layer': 'roads',
      'filter': ['==', 'kind', 'highway'],
      'minzoom': 5,
      'paint': {
        'line-color': c.roadHighway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 2, 16, 6],
      },
    },
    {
      'id': 'boundaries-country',
      'type': 'line',
      'source': 'protomaps',
      'source-layer': 'boundaries',
      'filter': ['<=', 'kind_detail', 2],
      'paint': {
        'line-color': c.boundary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 6, 1.5, 12, 2],
        'line-dasharray': [2, 1],
      },
    },
    {
      'id': 'boundaries-region',
      'type': 'line',
      'source': 'protomaps',
      'source-layer': 'boundaries',
      'filter': ['>', 'kind_detail', 2],
      'minzoom': 4,
      'paint': {
        'line-color': c.boundary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 0.8, 12, 1.5],
        'line-dasharray': [2, 2],
      },
    },
  ]

  if (labels === 'roads') {
    layers.push(
      {
        'id': 'labels-roads-major',
        'type': 'symbol',
        'source': 'protomaps',
        'source-layer': 'roads',
        'minzoom': 10,
        'filter': ['in', 'kind', 'highway', 'major_road', 'medium_road'],
        'layout': {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 12, 16, 13],
          'text-max-angle': 30,
          'text-padding': 1,
          'text-keep-upright': true,
        },
        'paint': {
          'text-color': c.label,
          'text-halo-color': c.labelHalo,
          'text-halo-width': 1,
        },
      },
      {
        'id': 'labels-roads-minor',
        'type': 'symbol',
        'source': 'protomaps',
        'source-layer': 'roads',
        'minzoom': 14,
        'filter': ['in', 'kind', 'minor_road', 'other'],
        'layout': {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 12],
          'text-max-angle': 30,
          'text-padding': 1,
          'text-keep-upright': true,
        },
        'paint': {
          'text-color': c.label,
          'text-halo-color': c.labelHalo,
          'text-halo-width': 1,
        },
      },
    )
  }

  layers.push({
    'id': 'labels-places',
    'type': 'symbol',
    'source': 'protomaps',
    'source-layer': 'places',
    'minzoom': 6,
    'filter': ['in', 'kind', 'locality', 'region', 'country'],
    'layout': {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 12, 14],
      'text-max-width': 10,
    },
    'paint': {
      'text-color': c.label,
      'text-halo-color': c.labelHalo,
      'text-halo-width': 1,
    },
  })

  return {
    version: 8,
    name: 'shadcn-dark',
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${tilesUrl}`,
        attribution: '© <a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    layers,
  }
}

export const darkStyle = createDarkStyle
