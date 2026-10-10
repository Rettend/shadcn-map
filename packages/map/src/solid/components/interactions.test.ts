import type { CompositeMarkerImage } from '../../shared/marker-layer-image'
import type { MarkerLayerProps } from './MarkerLayer'
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import * as maplibre from 'maplibre-gl'
import { createRoot, createSignal, flush, untrack } from 'solid-js'
import * as markerImages from '../../shared/marker-layer-image'
import { createMapContext } from '../context'
import { installAnimationFrames, MockMap, mountLayer, settleLayer } from './layer-test-support'

const { Map: MapView } = await import('./Map')
const { Marker } = await import('./Marker')
const { MarkerLayer } = await import('./MarkerLayer')

// Exercise the installed native handlers rather than copying their formulas.
const nativePackage = import.meta.resolve('maplibre-gl/package.json')
const nativeRequire = createRequire(nativePackage)
const { default: Point } = await import(nativeRequire.resolve('@mapbox/point-geometry'))
const { GeoJSONVT } = await import(nativeRequire.resolve('@maplibre/geojson-vt'))
const { GeoJSONWrapper, fromVectorTileJs } = await import(nativeRequire.resolve('@maplibre/vt-pbf'))
const { VectorTile } = await import(nativeRequire.resolve('@mapbox/vector-tile'))
const { PbfReader } = await import(nativeRequire.resolve('pbf'))
const { generateMousePanHandler, generateMousePitchHandler, generateMouseRotationHandler } =
  await import(fileURLToPath(new URL('./src/ui/handler/mouse.ts', nativePackage)))

class InteractionMap extends MockMap {
  setStyle() {}
}

let disposers: Array<() => void>
let frames: ReturnType<typeof installAnimationFrames>
let constructor: ReturnType<typeof spyOn<typeof maplibre, 'Map'>>
let defaultImage: ReturnType<typeof spyOn<typeof markerImages, 'createDefaultMarkerImage'>>
let compositeImage: ReturnType<typeof spyOn<typeof markerImages, 'createCompositeMarkerImage'>>
let markerConstructor: ReturnType<typeof spyOn<typeof maplibre, 'Marker'>>
let descriptors: Map<string, PropertyDescriptor | undefined>
let nativeMap: InteractionMap
let markerElement: EventTarget

beforeEach(() => {
  disposers = []
  frames = installAnimationFrames()
  descriptors = new globalThis.Map()
  for (const [name, value] of Object.entries({
    document: {
      documentElement: { matches: () => false },
      createElement: () => ({ getContext: () => ({}) }),
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  })) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, value })
  }
  nativeMap = new InteractionMap()
  constructor = spyOn(maplibre, 'Map').mockImplementation(function () {
    return nativeMap.asMap()
  } as unknown as typeof maplibre.Map)
  markerConstructor = spyOn(maplibre, 'Marker').mockImplementation(function (options) {
    markerElement = options.element
    return {
      setLngLat() {
        return this
      },
      addTo() {
        return this
      },
      on() {},
      off() {},
      remove() {},
    }
  } as unknown as typeof maplibre.Marker)
  defaultImage = spyOn(markerImages, 'createDefaultMarkerImage').mockReturnValue({
    image: {} as ImageData,
    pixelRatio: 2,
  } satisfies CompositeMarkerImage)
  compositeImage = spyOn(markerImages, 'createCompositeMarkerImage').mockImplementation(
    async () => ({
      image: {} as ImageData,
      pixelRatio: 2,
    }),
  )
})

afterEach(() => {
  for (const dispose of disposers.toReversed()) {
    dispose()
  }
  constructor.mockRestore()
  markerConstructor.mockRestore()
  defaultImage.mockRestore()
  compositeImage.mockRestore()
  frames.restore()
  for (const [name, descriptor] of descriptors) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, name)
    }
  }
})

function mountMap(onclick: () => void, options = {}) {
  const dispose = createRoot(dispose => {
    MapView({ tiles: 'https://example.com/map.pmtiles', style: 'light', onclick, ...options })
    return dispose
  })
  disposers.push(dispose)
  flush()
  expect(constructor).toHaveBeenCalledTimes(1)
  return dispose
}

async function mountMarkers(props: MarkerLayerProps) {
  const context = createRoot(dispose => {
    disposers.push(dispose)
    return createMapContext()
  })
  context.setMap(nativeMap.asMap())
  context.setLoaded(true)
  disposers.push(mountLayer(context, () => MarkerLayer(props)))
  await settleLayer()
  return [...nativeMap.layers.keys()].find(id => id.endsWith('-marker'))!
}

function clickEvent(layer: string, point = { x: 1, y: 2 }, id: string | number = 'a') {
  return {
    point,
    lngLat: { lng: point.x, lat: point.y },
    features: [{ id, properties: { markerId: id }, layer: { id: layer } }],
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
  }
}

describe('Solid map pointer interactions', () => {
  test.each(['map-first', 'marker-first'] as const)(
    'marker selection consumes the background click with %s registration',
    async order => {
      const selections: Array<string | null> = []
      const [selected, setSelected] = createSignal<string | null>(null)
      const onMapClick = () => {
        selections.push(null)
        setSelected(null)
      }
      if (order === 'map-first') {
        mountMap(onMapClick)
      }
      const layer = await mountMarkers({
        points: [{ id: 'a', lngLat: [1, 2] }],
        showLabels: false,
        get activeId() {
          return selected()
        },
        onclick: point => {
          selections.push(String(point.id))
          setSelected(String(point.id))
        },
      })
      if (order === 'marker-first') {
        mountMap(onMapClick)
      }

      nativeMap.emit('click', clickEvent(layer), layer)
      await settleLayer()

      expect(selections).toEqual(['a'])
      expect(untrack(selected)).toBe('a')
      const activeLayer = [...nativeMap.layers.values()].find(layer => layer.id.endsWith('-active'))
      expect(activeLayer.filter).toEqual(['==', ['get', 'markerId'], 'a'])
    },
  )

  test('transparent sprite corners remain background clicks', async () => {
    const background = mock()
    const marker = mock()
    mountMap(background)
    const layer = await mountMarkers({
      points: [{ id: 'a', lngLat: [1, 2] }],
      showLabels: false,
      onclick: marker,
    })
    nativeMap.emit('click', clickEvent(layer, { x: 18, y: 19 }), layer)
    await settleLayer()
    expect(marker).not.toHaveBeenCalled()
    expect(background).toHaveBeenCalledTimes(1)
  })

  test.each([
    ['parliament', false],
    ['parliament', true],
    ['42', true],
  ] as const)(
    'resolves string marker ID %s after native tile encoding (numeric collision: %s)',
    async (id, numericCollision) => {
      const background = mock()
      const marker = mock()
      mountMap(background)
      const layer = await mountMarkers({
        points: [
          { id, lngLat: [1, 2] },
          ...(numericCollision
            ? [{ id: Number.parseInt(id, 10) || 0, lngLat: [1, 2] as [number, number] }]
            : []),
        ],
        showLabels: false,
        onclick: marker,
      })
      const source = nativeMap.sources.get(nativeMap.layers.get(layer).source)!
      // This is the same GeoJSON -> MVT -> decoded feature path MapLibre uses.
      // MVT coerces nonnumeric string IDs to 0 and numeric strings to numbers.
      const tile = new GeoJSONVT(source.data, { extent: 8192 }).getTile(0, 0, 0)
      const encoded = fromVectorTileJs(
        new GeoJSONWrapper(tile.features, { version: 2, extent: 8192 }),
      )
      const decoded = new VectorTile(new PbfReader(encoded)).layers._geojsonTileLayer.feature(0)
      expect(decoded.id).toBe(Number.parseInt(id, 10) || 0)
      expect(decoded.properties.markerId).toBe(id)
      const event = clickEvent(layer, { x: 1, y: 2 }, id)
      event.features = [{ id: decoded.id, properties: decoded.properties, layer: { id: layer } }]
      nativeMap.emit('click', event, layer)
      await settleLayer()

      expect(marker).toHaveBeenCalledTimes(1)
      expect(marker.mock.calls[0]![0].id).toBe(id)
      expect(background).not.toHaveBeenCalled()
      for (const source of nativeMap.sources.values()) {
        expect(source.specification.promoteId).toBe('markerId')
      }
    },
  )

  test('marker badges consume clicks outside the main marker circle', async () => {
    const background = mock()
    const marker = mock()
    mountMap(background)
    const layer = await mountMarkers({
      points: [{ id: 'a', lngLat: [1, 2], badges: [{ label: 'Parking' }] }],
      showLabels: false,
      onclick: marker,
    })
    // A medium marker's top-right badge is centered at (15, -15).
    nativeMap.emit('click', clickEvent(layer, { x: 16, y: -13 }), layer)
    await settleLayer()
    expect(marker).toHaveBeenCalledTimes(1)
    expect(background).not.toHaveBeenCalled()
  })

  test('active DOM markers without a click callback do not clear selection', () => {
    const context = createRoot(dispose => {
      disposers.push(dispose)
      return createMapContext()
    })
    context.setMap(nativeMap.asMap())
    disposers.push(mountLayer(context, () => Marker({ lngLat: [1, 2], active: true })))
    const event = new Event('click', { bubbles: true })
    const stopPropagation = spyOn(event, 'stopPropagation')
    markerElement.dispatchEvent(event)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })

  test.each(['component', 'native'] as const)(
    'does not forward a queued background click after %s map disposal',
    async removal => {
      let clicks = 0
      const dispose = mountMap(() => clicks++)
      nativeMap.emit('click', clickEvent('background'))
      if (removal === 'component') {
        dispose()
      } else {
        nativeMap.remove()
      }
      await settleLayer()
      expect(clicks).toBe(0)
    },
  )

  test('uses native linear rotation consistently above and below the center', () => {
    mountMap(() => {})
    const options = constructor.mock.calls[0]![0]!
    expect(options.aroundCenter).toBe(false)
    for (const y of [50, 450]) {
      const rotation = generateMouseRotationHandler(
        { ...options, clickTolerance: 3, enable: true },
        () => new Point(250, 250),
      )
      rotation.dragStart({ button: 2, buttons: 2 }, new Point(250, y))
      expect(rotation.dragMove({ buttons: 2, preventDefault() {} }, new Point(270, y))).toEqual({
        bearingDelta: 16,
      })
    }
  })

  test('allows opting into native orbital rotation and disabling gestures', () => {
    mountMap(() => {}, {
      aroundCenter: true,
      interactive: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      touchZoomRotate: false,
    })
    expect(constructor.mock.calls[0]![0]).toMatchObject({
      aroundCenter: true,
      interactive: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      touchZoomRotate: false,
    })
  })

  test('keeps native up-to-pitch, left-pan, and zoom defaults without custom mouse handlers', () => {
    mountMap(() => {})
    const options = constructor.mock.calls[0]![0]!
    expect(options).toMatchObject({ interactive: true, dragRotate: true, pitchWithRotate: true })
    expect(options).not.toHaveProperty('dragPan')
    expect(options).not.toHaveProperty('scrollZoom')
    expect(options).not.toHaveProperty('pitchSpeed')
    const pitch = generateMousePitchHandler({ ...options, clickTolerance: 3, enable: true })
    const pan = generateMousePanHandler({ ...options, clickTolerance: 3, enable: true })
    const left = { button: 0, buttons: 1 }
    const right = { button: 2, buttons: 2 }
    const moveRight = { buttons: 2, preventDefault() {} }
    pitch.dragStart(left, new Point(0, 0))
    expect(pitch.dragMove({ buttons: 1, preventDefault() {} }, new Point(0, -20))).toBeUndefined()
    pitch.dragStart(right, new Point(0, 0))
    expect(pitch.dragMove(moveRight, new Point(0, -20))).toEqual({ pitchDelta: 10 })
    expect(pitch.dragMove(moveRight, new Point(0, 0))).toEqual({ pitchDelta: -10 })
    pan.dragStart(right, new Point(0, 0))
    expect(pan.dragMove(moveRight, new Point(20, 10))).toBeUndefined()
    pan.dragStart(left, new Point(0, 0))
    expect(pan.dragMove({ buttons: 1, preventDefault() {} }, new Point(20, 10))).toEqual({
      around: new Point(20, 10),
      panDelta: new Point(20, 10),
    })
  })
})
