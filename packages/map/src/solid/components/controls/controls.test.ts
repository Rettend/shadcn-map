import type { IControl, Map as MapLibreMap } from 'maplibre-gl'
import type { DiagnosticCapture } from 'solid-js'
import type { MapContextStore } from '../../context'
import type { GeolocateControlProps } from './GeolocateControl'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createEffect, createRoot, createSignal, flush, OBSERVE } from 'solid-js'
import { MapContext } from '../../context'
import { GeolocateControl } from './GeolocateControl'
import { NavigationControl } from './NavigationControl'
import { ScaleControl } from './ScaleControl'

class ControlElement extends EventTarget {
  className = ''
  children: ControlElement[] = []
  attributes = new Map<string, string>()
  removed = false

  appendChild(element: ControlElement) {
    this.children.push(element)
    return element
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  remove() {
    this.removed = true
  }
}

function createControlMap(mountElements = false) {
  const controls = new Set<IControl>()
  let container: ControlElement | undefined
  const map = {
    addControl: mock((control: IControl) => {
      controls.add(control)
      if (mountElements) {
        container = control.onAdd(map as unknown as MapLibreMap) as unknown as ControlElement
      }
    }),
    hasControl: (control: IControl) => controls.has(control),
    removeControl: mock((control: IControl) => {
      controls.delete(control)
      if (mountElements) {
        control.onRemove(map as unknown as MapLibreMap)
      }
    }),
  }
  return {
    map,
    controls,
    get container() {
      return container
    },
  }
}

function mountControl(
  component: () => unknown,
  map: ReturnType<typeof createControlMap>['map'],
  flyTo = mock(),
) {
  let dispose!: () => void
  let setMap!: (map: MapLibreMap | null) => void
  createRoot(rootDispose => {
    dispose = rootDispose
    const [currentMap, updateMap] = createSignal<MapLibreMap | null>(map as unknown as MapLibreMap)
    setMap = updateMap
    const context = {
      get map() {
        return currentMap()
      },
      flyTo,
    } as unknown as MapContextStore
    const content = MapContext({
      value: context,
      get children() {
        return component()
      },
    }) as () => unknown
    createEffect(
      () => content(),
      () => {},
    )
  })
  flush()
  return { dispose, setMap, flyTo }
}

describe('Solid map controls', () => {
  let documentDescriptor: PropertyDescriptor | undefined
  let windowDescriptor: PropertyDescriptor | undefined
  let navigatorDescriptor: PropertyDescriptor | undefined
  let diagnostics: DiagnosticCapture | undefined
  const requests: {
    success: PositionCallback
    error: PositionErrorCallback | null | undefined
    options: PositionOptions | undefined
  }[] = []

  beforeEach(() => {
    documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => new ControlElement() },
    })
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { document: globalThis.document },
    })
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition(
            success: PositionCallback,
            error?: PositionErrorCallback | null,
            options?: PositionOptions,
          ) {
            requests.push({ success, error, options })
          },
        },
      },
    })
    requests.length = 0
    diagnostics = OBSERVE?.diagnostics.capture()
  })

  afterEach(() => {
    const events = diagnostics?.stop() ?? []
    if (documentDescriptor) {
      Object.defineProperty(globalThis, 'document', documentDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'document')
    }
    if (windowDescriptor) {
      Object.defineProperty(globalThis, 'window', windowDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'navigator')
    }
    expect(events).toEqual([])
  })

  for (const [name, component] of [
    ['navigation', () => NavigationControl({})],
    ['scale', () => ScaleControl({})],
    ['geolocation', () => GeolocateControl({})],
  ] as const) {
    test(`${name} cleans up its mounting map after context is cleared`, () => {
      const { map, controls } = createControlMap()
      const { dispose, setMap } = mountControl(component, map)
      try {
        expect(controls.size).toBe(1)
        setMap(null)
        flush()
        dispose()
        expect(map.removeControl).toHaveBeenCalledTimes(1)
        expect(controls.size).toBe(0)
      } finally {
        dispose()
      }
    })

    test(`${name} does not remove an already-removed control`, () => {
      const { map, controls } = createControlMap()
      const { dispose } = mountControl(component, map)
      try {
        expect(controls.size).toBe(1)
        controls.clear()
        dispose()
        expect(map.removeControl).not.toHaveBeenCalled()
      } finally {
        dispose()
      }
    })
  }

  test('geolocation forwards live results and keeps its options', () => {
    const state = createControlMap(true)
    const onlocate = mock()
    const { dispose, flyTo } = mountControl(
      () => GeolocateControl({ zoom: 12, onlocate }),
      state.map,
    )
    try {
      state.container!.children[0]!.dispatchEvent(new Event('click'))
      expect(requests[0]!.options).toEqual({
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      })
      requests[0]!.success({ coords: { longitude: 19.04, latitude: 47.5 } } as GeolocationPosition)
      expect(flyTo).toHaveBeenCalledWith([19.04, 47.5], { zoom: 12 })
      expect(onlocate).toHaveBeenCalledWith([19.04, 47.5])
    } finally {
      dispose()
    }
  })

  for (const removal of ['component', 'map'] as const) {
    test(`geolocation ignores success and error after ${removal} removal`, () => {
      const state = createControlMap(true)
      const props: GeolocateControlProps = { onlocate: mock(), onerror: mock() }
      const { dispose, flyTo } = mountControl(() => GeolocateControl(props), state.map)
      try {
        const button = state.container!.children[0]!
        button.dispatchEvent(new Event('click'))
        expect(requests).toHaveLength(1)
        if (removal === 'component') {
          dispose()
        } else {
          state.map.removeControl(Array.from(state.controls)[0]!)
        }
        requests[0]!.success({
          coords: { longitude: 19.04, latitude: 47.5 },
        } as GeolocationPosition)
        requests[0]!.error?.({ code: 1 } as GeolocationPositionError)
        button.dispatchEvent(new Event('click'))
        expect(flyTo).not.toHaveBeenCalled()
        expect(props.onlocate).not.toHaveBeenCalled()
        expect(props.onerror).not.toHaveBeenCalled()
        expect(requests).toHaveLength(1)
      } finally {
        dispose()
      }
    })
  }
})
