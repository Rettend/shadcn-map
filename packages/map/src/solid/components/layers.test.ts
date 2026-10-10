import type { CompositeMarkerImage } from '../../shared/marker-layer-image'
import type { ClusterLayerProps, ClusterPoint } from './ClusterLayer'
import type { MarkerLayerProps } from './MarkerLayer'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { createRoot, createStore, flush } from 'solid-js'
import * as markerImages from '../../shared/marker-layer-image'
import { createMapContext } from '../context'
import { ClusterLayer } from './ClusterLayer'
import { installAnimationFrames, MockMap, mountLayer, settleLayer } from './layer-test-support'

const { MarkerLayer } = await import('./MarkerLayer')
const image = { image: {} as ImageData, pixelRatio: 2 } satisfies CompositeMarkerImage

let disposers: Array<() => void> = []
let frames: ReturnType<typeof installAnimationFrames>
let warn: ReturnType<typeof spyOn<typeof console, 'warn'>>
let defaultImage: ReturnType<typeof spyOn<typeof markerImages, 'createDefaultMarkerImage'>>
let compositeImage: ReturnType<typeof spyOn<typeof markerImages, 'createCompositeMarkerImage'>>

beforeEach(() => {
  disposers = []
  frames = installAnimationFrames()
  warn = spyOn(console, 'warn').mockImplementation(() => {})
  defaultImage = spyOn(markerImages, 'createDefaultMarkerImage').mockReturnValue(image)
  compositeImage = spyOn(markerImages, 'createCompositeMarkerImage').mockImplementation(
    async options => {
      structuredClone(options)
      return image
    },
  )
})

afterEach(() => {
  try {
    for (const dispose of disposers.toReversed()) {
      dispose()
    }
    expect(
      warn.mock.calls.filter(args => String(args[0]).includes('STRICT_READ_UNTRACKED')),
    ).toEqual([])
  } finally {
    warn.mockRestore()
    defaultImage.mockRestore()
    compositeImage.mockRestore()
    frames.restore()
  }
})

function createFixture<T extends object>(initial: T) {
  const fixture = createRoot(dispose => {
    const context = createMapContext()
    const [state, setState] = createStore({ value: initial })
    disposers.push(dispose)
    return {
      context,
      // oxlint-disable-next-line solid/reactivity -- Retain the fixture's stable store proxy; setters only mutate its contents.
      store: state.value,
      setStore: (update: (draft: T) => void) => setState(draft => update(draft.value)),
    }
  })
  const map = new MockMap()
  fixture.context.setMap(map.asMap())
  fixture.context.setLoaded(true)
  flush()
  return { ...fixture, map }
}

function mainSource(map: MockMap) {
  const entry = [...map.sources.entries()].find(([id]) => !id.endsWith('-hover-source'))
  expect(entry).toBeDefined()
  return entry![1]
}

function layerId(map: MockMap, suffix: string) {
  const id = [...map.layers.keys()].find(id => id.endsWith(suffix))
  expect(id).toBeDefined()
  return id!
}

describe('Solid map layer effects', () => {
  test('ClusterLayer updates plain source data after nested edits and array insertion', () => {
    const fixture = createFixture<{ points: ClusterPoint[] }>({
      points: [{ id: 'a', lngLat: [1, 2], properties: { name: 'Before' } }],
    })
    disposers.push(mountLayer(fixture.context, () => ClusterLayer(fixture.store)))
    const source = mainSource(fixture.map)
    const initialData = source.data

    fixture.setStore(draft => {
      draft.points[0]!.lngLat[0] = 5
      draft.points[0]!.properties!.name = 'After'
      draft.points.push({ id: 'b', lngLat: [3, 4] })
    })
    flush()

    expect(source.data.features).toHaveLength(2)
    expect(source.data.features[0]).toMatchObject({
      geometry: { coordinates: [5, 2] },
      properties: { id: 'a', name: 'After' },
    })
    expect(initialData.features[0]).toMatchObject({
      geometry: { coordinates: [1, 2] },
      properties: { name: 'Before' },
    })
  })

  test('MarkerLayer updates nested point coordinates, icons, badges, and properties', async () => {
    const fixture = createFixture<MarkerLayerProps>({
      showLabels: false,
      points: [
        {
          id: 'a',
          lngLat: [1, 2],
          icon: { svgBody: '<path/>', svgWidth: 24, svgHeight: 24 },
          badges: [{ color: '#111111', label: 'Before' }],
          properties: { name: 'Before' },
        },
      ],
    })
    disposers.push(mountLayer(fixture.context, () => MarkerLayer(fixture.store)))
    await settleLayer()
    const source = mainSource(fixture.map)
    const originalImage = source.data.features[0]!.properties!.markerImage

    fixture.setStore(draft => {
      const point = draft.points[0]!
      point.lngLat[0] = 5
      if (typeof point.icon === 'object') {
        point.icon.svgBody = '<circle/>'
      }
      point.badges![0]!.color = '#222222'
      point.properties!.name = 'After'
    })
    await settleLayer()

    expect(source.data.features[0]).toMatchObject({
      geometry: { coordinates: [5, 2] },
      properties: { name: 'After' },
    })
    expect(source.data.features[0]!.properties!.markerImage).not.toBe(originalImage)
    expect(compositeImage.mock.calls.at(-1)![0]).toMatchObject({
      icon: { svgBody: '<circle/>' },
      badges: [{ color: '#222222' }],
    })
  })

  test('MarkerLayer tracks edits to fallback icon and badges independently of points', async () => {
    const fixture = createFixture<MarkerLayerProps>({
      showLabels: false,
      points: [{ id: 'a', lngLat: [1, 2] }],
      icon: { svgBody: '<path/>' },
      badges: [{ color: '#111111' }],
    })
    disposers.push(mountLayer(fixture.context, () => MarkerLayer(fixture.store)))
    await settleLayer()
    const source = mainSource(fixture.map)
    const originalImage = source.data.features[0]!.properties!.markerImage

    fixture.setStore(draft => {
      if (typeof draft.icon === 'object') {
        draft.icon.svgBody = '<circle/>'
      }
      draft.badges![0]!.color = '#222222'
    })
    await settleLayer()

    expect(source.data.features[0]!.properties!.markerImage).not.toBe(originalImage)
    expect(compositeImage.mock.calls.at(-1)![0]).toMatchObject({
      icon: { svgBody: '<circle/>' },
      badges: [{ color: '#222222' }],
    })
  })

  test('MarkerLayer refreshes mode-dependent images with an explicit stroke color', async () => {
    const fixture = createFixture({})
    const props: MarkerLayerProps = {
      points: [{ id: 'a', lngLat: [1, 2], badges: [{ color: '#111111' }] }],
      strokeColor: '#334455',
      showLabels: false,
    }
    disposers.push(mountLayer(fixture.context, () => MarkerLayer(props)))
    await settleLayer()
    const source = mainSource(fixture.map)
    const originalImage = source.data.features[0]!.properties!.markerImage

    fixture.context.setResolvedMode('light')
    await settleLayer()

    expect(source.data.features[0]!.properties!.markerImage).not.toBe(originalImage)
    expect(compositeImage.mock.calls.at(-1)![0]).toMatchObject({
      strokeColor: '#334455',
      badgeStrokeColor: 'rgba(255, 255, 255, 0.3)',
    })
  })

  test('MarkerLayer handles source removal metadata and recovers through repeated style replacements', async () => {
    const fixture = createFixture<MarkerLayerProps>({
      points: [{ id: 'parliament', lngLat: [1, 2] }],
      showLabels: false,
    })
    disposers.push(mountLayer(fixture.context, () => MarkerLayer(fixture.store)))
    await settleLayer()

    for (const mode of ['light', 'dark'] as const) {
      const previousSource = mainSource(fixture.map)
      fixture.context.setResolvedMode(mode)
      flush()
      fixture.map.layers.clear()
      fixture.map.images.clear()
      for (const sourceId of fixture.map.sources.keys()) {
        fixture.map.removeSource(sourceId)
      }
      fixture.map.emit('style.load')
      await settleLayer()

      expect(fixture.map.errors).toEqual([])
      expect(mainSource(fixture.map)).not.toBe(previousSource)
      expect(fixture.map.sources.size).toBe(2)
      expect(fixture.map.layers.size).toBe(4)
      expect(mainSource(fixture.map).data.features[0]!.properties!.markerId).toBe('parliament')
    }
  })

  test('ClusterLayer retries configuration and data updates when the map becomes idle', () => {
    const fixture = createFixture<ClusterLayerProps>({
      points: [{ id: 'a', lngLat: [1, 2] }],
      clusterRadius: 50,
    })
    disposers.push(mountLayer(fixture.context, () => ClusterLayer(fixture.store)))
    const originalSource = mainSource(fixture.map)
    fixture.map.styleLoaded = false
    fixture.setStore(draft => {
      draft.clusterRadius = 75
      draft.clusterMaxZoom = 10
      draft.showUnclustered = false
      draft.points[0]!.lngLat[0] = 5
    })
    fixture.context.setResolvedMode('light')
    flush()
    expect(mainSource(fixture.map)).toBe(originalSource)

    const addSource = fixture.map.addSource.bind(fixture.map)
    fixture.map.addSource = (id, specification) => {
      addSource(id, specification)
      fixture.map.styleLoaded = false
      fixture.map.emit('sourcedata')
    }
    fixture.map.styleLoaded = true
    fixture.map.emit('idle')

    const source = mainSource(fixture.map)
    expect(source).not.toBe(originalSource)
    expect(source.specification).toMatchObject({ clusterRadius: 75, clusterMaxZoom: 10 })
    expect(source.data.features[0]!.geometry.coordinates).toEqual([5, 2])
    expect([...fixture.map.layers.keys()].some(id => id.endsWith('-point'))).toBe(false)
    expect(
      fixture.map.layers.get(layerId(fixture.map, '-cluster')).paint['circle-stroke-color'],
    ).toBe('#ffffff')
    expect(
      fixture.map.paintWrites.some(
        write => write.property === 'circle-stroke-color' && write.value === '#ffffff',
      ),
    ).toBe(true)
  })

  test('ClusterLayer retries a theme-only update after source loading settles', () => {
    const fixture = createFixture<ClusterLayerProps>({ points: [{ id: 'a', lngLat: [1, 2] }] })
    disposers.push(mountLayer(fixture.context, () => ClusterLayer(fixture.store)))
    const clusterId = layerId(fixture.map, '-cluster')
    fixture.map.styleLoaded = false
    fixture.context.setResolvedMode('light')
    flush()
    expect(fixture.map.layers.get(clusterId).paint['circle-stroke-color']).toBe('#09090b')

    fixture.map.styleLoaded = true
    fixture.map.emit('sourcedata')

    expect(fixture.map.layers.get(clusterId).paint['circle-stroke-color']).toBe('#ffffff')
    expect(fixture.map.layers.get(layerId(fixture.map, '-point')).paint['circle-color']).toBe(
      '#0284c7',
    )
  })

  test.each(['configuration', 'data'] as const)(
    'ignores expansion replies after cluster source %s changes',
    async change => {
      const fixture = createFixture<ClusterLayerProps>({ points: [{ id: 'a', lngLat: [1, 2] }] })
      let clusterClicks = 0
      disposers.push(
        mountLayer(fixture.context, () =>
          ClusterLayer({
            get points() {
              return fixture.store.points
            },
            get clusterRadius() {
              return fixture.store.clusterRadius
            },
            onclusterclick: () => {
              clusterClicks += 1
            },
          }),
        ),
      )
      const source = mainSource(fixture.map)
      let resolveZoom!: (zoom: number) => void
      source.getClusterExpansionZoom = () => new Promise(resolve => (resolveZoom = resolve))
      fixture.map.emit(
        'dblclick',
        {
          preventDefault() {},
          features: [{ properties: { cluster_id: 1 }, geometry: { coordinates: [1, 2] } }],
        },
        layerId(fixture.map, '-cluster'),
      )

      fixture.setStore(draft => {
        if (change === 'configuration') {
          draft.clusterRadius = 75
        } else {
          draft.points[0]!.lngLat[0] = 5
        }
      })
      flush()
      resolveZoom(10)
      await settleLayer()

      expect(fixture.map.easeCalls).toEqual([])
      expect(clusterClicks).toBe(0)
    },
  )

  test.each(['marker', 'cluster'] as const)(
    'cleans up the %s layer after native map removal',
    async layer => {
      const fixture = createFixture({ points: [{ id: 'a', lngLat: [1, 2] as [number, number] }] })
      const dispose = mountLayer(fixture.context, () =>
        layer === 'marker'
          ? MarkerLayer({ points: fixture.store.points, showLabels: false })
          : ClusterLayer({ points: fixture.store.points, onunclusteredchange() {} }),
      )
      disposers.push(dispose)
      await settleLayer()
      expect(fixture.map.layers.size).toBeGreaterThan(0)
      expect(frames.callbacks.size).toBeGreaterThan(0)

      expect(() => fixture.map.remove()).not.toThrow()
      expect(() => dispose()).not.toThrow()
      expect(frames.callbacks.size).toBe(0)
      expect([...fixture.map.listeners.values()].flat()).toEqual([])
    },
  )

  test.each(['marker', 'cluster'] as const)(
    'removes %s resources and subscriptions on component disposal',
    async layer => {
      const fixture = createFixture({ points: [{ id: 'a', lngLat: [1, 2] as [number, number] }] })
      const dispose = mountLayer(fixture.context, () =>
        layer === 'marker'
          ? MarkerLayer({ points: fixture.store.points, showLabels: false })
          : ClusterLayer({ points: fixture.store.points, onunclusteredchange() {} }),
      )
      disposers.push(dispose)
      await settleLayer()

      dispose()

      expect(fixture.map.sources.size).toBe(0)
      expect(fixture.map.layers.size).toBe(0)
      expect(fixture.map.images.size).toBe(0)
      expect(frames.callbacks.size).toBe(0)
      expect([...fixture.map.listeners.values()].flat()).toEqual([])
    },
  )

  test('does not register a pending marker image after native map removal', async () => {
    const fixture = createFixture({})
    let resolveImage!: (image: CompositeMarkerImage) => void
    const pendingImage = new Promise<CompositeMarkerImage>(resolve => (resolveImage = resolve))
    compositeImage.mockReturnValue(pendingImage)
    disposers.push(
      mountLayer(fixture.context, () =>
        MarkerLayer({
          points: [{ id: 'a', lngLat: [1, 2], icon: { svgBody: '<path/>' } }],
          showLabels: false,
        }),
      ),
    )
    expect(compositeImage).toHaveBeenCalled()

    fixture.map.remove()
    resolveImage(image)
    await settleLayer()

    expect(fixture.map.images.size).toBe(0)
    expect(fixture.map.sources.size).toBe(0)
    expect([...fixture.map.listeners.values()].flat()).toEqual([])
  })
})
