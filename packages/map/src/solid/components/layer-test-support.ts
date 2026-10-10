import type { FeatureCollection, Point } from 'geojson'
import type { MapLibreMap } from '../../shared/types'
import type { MapContextStore } from '../context'
import { file, plugin, Transpiler } from 'bun'
import { createEffect, createRoot, flatten, flush, untrack } from 'solid-js'
import { MapContextProvider } from '../context'

// These tests exercise component effects, not rendering. Compile the JSX to a
// no-op factory without changing the component's setup/effects.
const transpiler = new Transpiler({
  loader: 'tsx',
  tsconfig: JSON.stringify({ compilerOptions: { jsx: 'react', jsxFactory: 'layerTestJSX' } }),
})

plugin({
  name: 'headless-map-layer-tests',
  setup(build) {
    build.onLoad(
      { filter: /[/\\]solid[/\\]components[/\\](Map|Marker|MarkerLayer|Popup)\.tsx$/ },
      async ({ path }) => ({
        loader: 'js',
        contents: `${transpiler.transformSync(await file(path).text())}\nfunction layerTestJSX(type, props) { props?.ref?.(new EventTarget()); return null; }`,
      }),
    )
  },
})

export class MockSource {
  data: FeatureCollection<Point>
  writes: FeatureCollection<Point>[] = []
  getClusterExpansionZoom = (_id: number) => Promise.resolve(10)

  constructor(
    readonly specification: Record<string, unknown> & { data: FeatureCollection<Point> },
  ) {
    this.data = structuredClone(specification.data)
  }

  setData(data: FeatureCollection<Point>) {
    // A native boundary must receive plain data rather than reactive proxies.
    this.data = structuredClone(data)
    this.writes.push(this.data)
  }
}

interface Listener {
  layers: string[] | null
  callback: (event: any) => void
}

export class MockMap {
  sources = new Map<string, MockSource>()
  layers = new Map<string, any>()
  images = new Map<string, unknown>()
  listeners = new Map<string, Listener[]>()
  paintWrites: Array<{ id: string; property: string; value: unknown }> = []
  easeCalls: unknown[] = []
  errors: Error[] = []
  canvas = { style: { cursor: '' } }
  styleLoaded = true
  removed = false

  asMap() {
    return this as unknown as MapLibreMap
  }

  on(
    type: string,
    layersOrCallback: string | string[] | Listener['callback'],
    callback?: Listener['callback'],
  ) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push({
      layers: typeof layersOrCallback === 'function' ? null : [layersOrCallback].flat(),
      callback: typeof layersOrCallback === 'function' ? layersOrCallback : callback!,
    })
    this.listeners.set(type, listeners)
  }

  off(
    type: string,
    layersOrCallback: string | string[] | Listener['callback'],
    callback?: Listener['callback'],
  ) {
    const listener = typeof layersOrCallback === 'function' ? layersOrCallback : callback
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(entry => entry.callback !== listener),
    )
  }

  emit(type: string, event: unknown = {}, layer?: string) {
    // oxlint-disable-next-line unicorn/no-useless-spread -- Snapshot listeners so registrations during dispatch wait until the next event.
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (!listener.layers || (layer && listener.layers.includes(layer))) {
        listener.callback(event)
      }
    }
  }

  assertAvailable() {
    if (this.removed) {
      throw new Error('Map resources are unavailable after remove()')
    }
  }

  isStyleLoaded() {
    this.assertAvailable()
    return this.styleLoaded
  }

  getSource(id: string) {
    this.assertAvailable()
    return this.sources.get(id)
  }

  addSource(id: string, specification: ConstructorParameters<typeof MockSource>[0]) {
    this.assertAvailable()
    this.sources.set(id, new MockSource(specification))
  }

  removeSource(id: string) {
    this.assertAvailable()
    this.sources.delete(id)
    // Native style replacement emits metadata after deleting the tile manager.
    this.emit('sourcedata', { sourceId: id, sourceDataType: 'metadata' })
  }

  getLayer(id: string) {
    this.assertAvailable()
    return this.layers.get(id)
  }

  addLayer(layer: { id: string }) {
    this.assertAvailable()
    this.layers.set(layer.id, structuredClone(layer))
  }

  removeLayer(id: string) {
    this.assertAvailable()
    this.layers.delete(id)
  }

  setPaintProperty(id: string, property: string, value: unknown) {
    this.assertAvailable()
    this.paintWrites.push({ id, property, value: structuredClone(value) })
    this.layers.get(id).paint[property] = value
  }

  setFilter(id: string, filter: unknown) {
    this.assertAvailable()
    this.layers.get(id).filter = filter
  }

  hasImage(id: string) {
    this.assertAvailable()
    return this.images.has(id)
  }

  addImage(id: string, image: unknown) {
    this.assertAvailable()
    this.images.set(id, image)
  }

  removeImage(id: string) {
    this.assertAvailable()
    this.images.delete(id)
  }

  isSourceLoaded(id: string) {
    if (!this.getSource(id)) {
      const error = new Error(`There is no tile manager with ID '${id}'`)
      this.errors.push(error)
      this.emit('error', { error })
      return false
    }
    return true
  }

  getCanvas() {
    this.assertAvailable()
    return this.canvas
  }

  getZoom() {
    return 12
  }

  project(coordinates: [number, number]) {
    return { x: coordinates[0], y: coordinates[1] }
  }

  easeTo(options: unknown) {
    this.assertAvailable()
    this.easeCalls.push(options)
  }

  remove() {
    this.removed = true
    this.sources.clear()
    this.layers.clear()
    this.images.clear()
    this.emit('remove')
  }
}

export function mountLayer(context: MapContextStore, mount: () => unknown) {
  const dispose = createRoot(dispose => {
    const branch = MapContextProvider({
      value: context,
      get children() {
        untrack(mount)
        return null
      },
    })
    createEffect(
      () => flatten(branch),
      () => {},
    )
    return dispose
  })
  flush()
  return dispose
}

export function installAnimationFrames() {
  const requestDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
  const cancelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame')
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextId = 0
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      callbacks.set(++nextId, callback)
      return nextId
    },
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (id: number) => callbacks.delete(id),
  })
  return {
    callbacks,
    restore() {
      if (requestDescriptor) {
        Object.defineProperty(globalThis, 'requestAnimationFrame', requestDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
      }
      if (cancelDescriptor) {
        Object.defineProperty(globalThis, 'cancelAnimationFrame', cancelDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'cancelAnimationFrame')
      }
    },
  }
}

export async function settleLayer() {
  flush()
  // Let image/expansion promise chains finish before the next task.
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  flush()
}
