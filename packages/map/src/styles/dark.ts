import type { StyleSpecification } from 'maplibre-gl'
import { colors } from './colors'

/**
 * Minimal dark map style
 * Extremely clean, focusing on roads with subtle water
 */
export function createDarkStyle(tilesUrl: string): StyleSpecification {
  const c = colors.dark

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
    layers: [
      // Background
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': c.background,
        },
      },
      // Land (barely visible, for coastlines)
      {
        'id': 'land',
        'type': 'fill',
        'source': 'protomaps',
        'source-layer': 'land',
        'paint': {
          'fill-color': c.land,
        },
      },
      // Water
      {
        'id': 'water',
        'type': 'fill',
        'source': 'protomaps',
        'source-layer': 'water',
        'paint': {
          'fill-color': c.water,
        },
      },
      // Buildings (only at high zoom)
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
      // Roads - minor
      {
        'id': 'roads-minor',
        'type': 'line',
        'source': 'protomaps',
        'source-layer': 'roads',
        'filter': ['in', 'pmap:kind', 'minor_road', 'other', 'path'],
        'minzoom': 12,
        'paint': {
          'line-color': c.roadMinor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 2],
        },
      },
      // Roads - major
      {
        'id': 'roads-major',
        'type': 'line',
        'source': 'protomaps',
        'source-layer': 'roads',
        'filter': ['in', 'pmap:kind', 'major_road', 'medium_road'],
        'minzoom': 8,
        'paint': {
          'line-color': c.roadMajor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 2, 16, 4],
        },
      },
      // Roads - highway
      {
        'id': 'roads-highway',
        'type': 'line',
        'source': 'protomaps',
        'source-layer': 'roads',
        'filter': ['==', 'pmap:kind', 'highway'],
        'minzoom': 5,
        'paint': {
          'line-color': c.roadHighway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 2, 16, 6],
        },
      },
      // Boundaries
      {
        'id': 'boundaries',
        'type': 'line',
        'source': 'protomaps',
        'source-layer': 'boundaries',
        'paint': {
          'line-color': c.boundary,
          'line-width': 1,
          'line-dasharray': [2, 2],
        },
      },
      // Labels - places (minimal, only major)
      {
        'id': 'labels-places',
        'type': 'symbol',
        'source': 'protomaps',
        'source-layer': 'places',
        'minzoom': 6,
        'filter': ['in', 'pmap:kind', 'city', 'state', 'country'],
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
      },
    ],
  }
}

export const darkStyle = createDarkStyle
