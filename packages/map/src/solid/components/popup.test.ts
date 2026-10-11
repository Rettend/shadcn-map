import type { PopupOptions } from 'maplibre-gl'
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import * as maplibre from 'maplibre-gl'
import { createRoot, createSignal, flush, OBSERVE, untrack } from 'solid-js'
import { createMapContext } from '../context'
import { MockMap, mountLayer } from './layer-test-support'

const { Marker } = await import('./Marker')
const { Popup } = await import('./Popup')

class NativePopup {
  open = false
  coordinates: [number, number] | undefined
  offsets: Array<number | [number, number]> = []
  closeListener: (() => void) | undefined

  constructor(readonly options: PopupOptions) {}
  setDOMContent() {
    return this
  }
  setLngLat(coordinates: [number, number]) {
    this.coordinates = coordinates
    return this
  }
  setOffset(offset: number | [number, number]) {
    this.offsets.push(offset)
    return this
  }
  on(_type: string, listener: () => void) {
    this.closeListener = listener
  }
  off() {
    this.closeListener = undefined
  }
  isOpen() {
    return this.open
  }
  addTo() {
    this.open = true
    return this
  }
  remove() {
    if (this.open) {
      this.open = false
      this.closeListener?.()
    }
    return this
  }
}

let disposers: Array<() => void>
let popupConstructor: ReturnType<typeof spyOn<typeof maplibre, 'Popup'>>
let markerConstructor: ReturnType<typeof spyOn<typeof maplibre, 'Marker'>>
let popup: NativePopup
let documentDescriptor: PropertyDescriptor | undefined
let dragEnd: (() => void) | undefined

beforeEach(() => {
  documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => new EventTarget() },
  })
  disposers = []
  dragEnd = undefined
  popupConstructor = spyOn(maplibre, 'Popup').mockImplementation(function (options: PopupOptions) {
    popup = new NativePopup(options)
    return popup
  } as unknown as typeof maplibre.Popup)
  markerConstructor = spyOn(maplibre, 'Marker').mockImplementation(function () {
    return {
      setLngLat() {
        return this
      },
      setDraggable() {},
      addTo() {
        return this
      },
      getLngLat() {
        return { lng: 21, lat: 49 }
      },
      on(_type: string, listener: () => void) {
        dragEnd = listener
      },
      off() {},
      remove() {},
    }
  } as unknown as typeof maplibre.Marker)
})

afterEach(() => {
  for (const dispose of disposers.toReversed()) {
    dispose()
  }
  popupConstructor.mockRestore()
  markerConstructor.mockRestore()
  if (documentDescriptor) {
    Object.defineProperty(globalThis, 'document', documentDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'document')
  }
})

function createSelectionFixture() {
  const fixture = createRoot(dispose => {
    disposers.push(dispose)
    const context = createMapContext()
    const [selected, setSelected] = createSignal<'castle' | 'museum'>('castle')
    const [open, setOpen] = createSignal(true)
    return { context, selected, setSelected, open, setOpen }
  })
  fixture.context.setMap(new MockMap().asMap())
  flush()
  const onclose = mock(() => fixture.setOpen(false))
  const dispose = mountLayer(fixture.context, () => {
    Marker({
      get lngLat() {
        return fixture.selected() === 'castle' ? [19.0399, 47.4962] : [19.0779, 47.5158]
      },
      get size() {
        return fixture.selected() === 'castle' ? 'sm' : 'lg'
      },
    })
    Popup({
      get lngLat() {
        return fixture.selected() === 'castle' ? [19.0399, 47.4962] : [19.0779, 47.5158]
      },
      get open() {
        return fixture.open()
      },
      onclose,
    })
  })
  disposers.push(dispose)
  return { ...fixture, dispose, onclose }
}

describe('Solid popup selection lifecycle', () => {
  test('keeps marker ownership and size offset stable while selection moves the DOM marker', () => {
    const fixture = createSelectionFixture()
    const markerId = untrack(() => fixture.context.activePopupMarkerId)
    expect(markerId).not.toBeNull()
    expect(popup.isOpen()).toBe(true)
    const clearOwner = spyOn(fixture.context, 'clearPopupMarker')
    const diagnostics = OBSERVE?.diagnostics.capture()
    popup.offsets = []

    for (const selected of ['museum', 'castle', 'museum', 'castle', 'museum'] as const) {
      fixture.setSelected(selected)
      flush()
      expect(untrack(() => fixture.context.activePopupMarkerId)).toBe(markerId)
      expect(popup.coordinates).toEqual(
        selected === 'castle' ? [19.0399, 47.4962] : [19.0779, 47.5158],
      )
    }

    const events = diagnostics?.stop() ?? []
    expect(events.filter(event => event.code === 'EFFECT_RELAY_TEAR')).toEqual([])
    expect(clearOwner).not.toHaveBeenCalled()
    expect(popup.offsets).toEqual([
      [0, -20],
      [0, -12],
      [0, -20],
      [0, -12],
      [0, -20],
    ])
    clearOwner.mockRestore()
  })

  test('releases ownership on close and restores it on reopen without a user-close callback', () => {
    const fixture = createSelectionFixture()
    const markerId = untrack(() => fixture.context.activePopupMarkerId)
    fixture.setOpen(false)
    flush()
    expect(popup.isOpen()).toBe(false)
    expect(untrack(() => fixture.context.activePopupMarkerId)).toBeNull()
    expect(fixture.onclose).not.toHaveBeenCalled()

    fixture.setOpen(true)
    flush()
    expect(popup.isOpen()).toBe(true)
    expect(untrack(() => fixture.context.activePopupMarkerId)).toBe(markerId)
    fixture.dispose()
    flush()
    expect(popup.isOpen()).toBe(false)
    expect(untrack(() => fixture.context.activePopupMarkerId)).toBeNull()
  })

  test('native close clears ownership and notifies the parent once', () => {
    const fixture = createSelectionFixture()
    popup.remove()
    flush()
    expect(fixture.onclose).toHaveBeenCalledTimes(1)
    expect(untrack(() => fixture.context.activePopupMarkerId)).toBeNull()
    expect(popup.isOpen()).toBe(false)
  })

  test('does not suppress a native close immediately after a controlled close and reopen', () => {
    const fixture = createSelectionFixture()
    fixture.setOpen(false)
    flush()
    fixture.setOpen(true)
    flush()
    popup.remove()
    flush()
    expect(fixture.onclose).toHaveBeenCalledTimes(1)
    expect(fixture.context.activePopupMarkerId).toBeNull()
  })

  test('keeps drag coordinates registered until the controlled location changes', () => {
    const fixture = createSelectionFixture()
    dragEnd!()
    flush()
    expect([...fixture.context.markers.values()][0]?.lngLat).toEqual([21, 49])
    fixture.setSelected('museum')
    flush()
    expect([...fixture.context.markers.values()][0]?.lngLat).toEqual([19.0779, 47.5158])
  })
})
