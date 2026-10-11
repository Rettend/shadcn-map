import type { Map as MapLibreMap, MarkerOptions } from 'maplibre-gl'
import { render } from '@solidjs/web'
import * as maplibre from 'maplibre-gl'
import { createEffect, createRoot, createSignal, flush, OBSERVE, Show } from 'solid-js'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { Marker } from '../../src/solid/components/Marker'
import { Popup } from '../../src/solid/components/Popup'
import { createMapContext, MapContextProvider } from '../../src/solid/context'

vi.mock('maplibre-gl', async importOriginal => ({
  ...(await importOriginal<typeof maplibre>()),
  Marker: vi.fn(function (options: MarkerOptions) {
    return {
      setLngLat() {
        return this
      },
      setDraggable() {},
      addTo() {
        canvasContainer.append(options.element!)
        return this
      },
      on() {},
      off() {},
      remove() {
        options.element!.remove()
      },
    }
  }),
}))

let container: HTMLDivElement
let canvasContainer: HTMLDivElement
let map: MapLibreMap
let dispose: (() => void) | undefined

beforeEach(() => {
  container = document.createElement('div')
  canvasContainer = document.createElement('div')
  container.append(canvasContainer)
  document.body.append(container)
  map = Object.assign(Object.create(maplibre.Map.prototype) as MapLibreMap, {
    _canvasContainer: canvasContainer,
    _camera: {
      transform: {
        width: 390,
        height: 700,
        getCoveringTilesDetailsProvider: () => ({ allowWorldCopies: () => false }),
        isLocationOccluded: () => false,
      },
    },
    getContainer: () => container,
    getCanvasContainer: () => canvasContainer,
    _getUIString: () => 'Close popup',
    project: () => new maplibre.Point(195, 300),
  })
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  container.remove()
  vi.restoreAllMocks()
})

function mount(options = {}) {
  const fixture = createRoot(disposeRoot => {
    const context = createMapContext()
    const [selected, setSelected] = createSignal('Castle')
    const [hovered, setHovered] = createSignal(true)
    const [open, setOpen] = createSignal(true)
    const observations: unknown[] = []
    createEffect(
      () => [selected(), [...context.markers.values()].map(marker => marker.lngLat)],
      value => {
        observations.push(value)
      },
    )
    return {
      context,
      selected,
      setSelected,
      hovered,
      setHovered,
      open,
      setOpen,
      observations,
      disposeRoot,
    }
  })
  fixture.context.setMap(map)
  flush()
  const disposeRender = render(
    () => (
      <MapContextProvider value={fixture.context}>
        <Show when={fixture.hovered()}>
          <div class="hover-tooltip">Hover</div>
        </Show>
        <Marker lngLat={fixture.selected() === 'Castle' ? [19, 47] : [20, 48]} />
        <Popup
          lngLat={fixture.selected() === 'Castle' ? [19, 47] : [20, 48]}
          open={fixture.open()}
          onclose={() => fixture.setOpen(false)}
          {...options}
        >
          <strong>{fixture.selected()}</strong>
          <button type="button">Details</button>
        </Popup>
      </MapContextProvider>
    ),
    container,
  )
  dispose = () => {
    disposeRender()
    fixture.disposeRoot()
  }
  flush()
  return fixture
}

test('keeps reactive popup content attached when a sibling hover tooltip is removed', () => {
  const fixture = mount()
  const popup = container.querySelector('.maplibregl-popup')!
  expect(popup.querySelector('strong')?.textContent).toBe('Castle')
  fixture.setHovered(false)
  flush()
  expect(popup.querySelector('strong')?.textContent).toBe('Castle')
  expect(container.querySelector(':scope > .shadcn-popup-content')).toBeNull()

  fixture.setSelected('Museum')
  flush()
  expect(container.querySelector('.maplibregl-popup')).toBe(popup)
  expect(popup.querySelector('strong')?.textContent).toBe('Museum')
  fixture.setOpen(false)
  flush()
  expect(container.querySelector('.maplibregl-popup')).toBeNull()
  fixture.setOpen(true)
  flush()
  expect(container.querySelector('.maplibregl-popup strong')?.textContent).toBe('Museum')

  dispose!()
  dispose = undefined
  flush()
  expect(container.querySelector('.maplibregl-popup')).toBeNull()
  expect(fixture.context.activePopupMarkerId).toBeNull()
})

test('selection updates do not relay derived marker state through effects', () => {
  const fixture = mount()
  const diagnostics = OBSERVE!.diagnostics.capture()
  fixture.observations.length = 0
  for (const selected of ['Museum', 'Castle', 'Museum']) {
    fixture.setSelected(selected)
    flush()
  }
  const events = diagnostics.stop()
  expect(events.filter(event => event.code === 'EFFECT_RELAY_TEAR')).toEqual([])
  expect(fixture.observations).toEqual([
    ['Museum', [[20, 48]]],
    ['Castle', [[19, 47]]],
    ['Museum', [[20, 48]]],
  ])
})

test('focuses popup actions by default and supports opting out', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  mount()
  expect(focus).toHaveBeenCalledOnce()
  dispose!()
  dispose = undefined
  focus.mockClear()

  mount({ focusAfterOpen: false, closeButton: false, maxWidth: '280px', popupClass: 'selection' })
  expect(focus).not.toHaveBeenCalled()
  const popup = container.querySelector<HTMLElement>('.maplibregl-popup')!
  expect(popup.classList.contains('selection')).toBe(true)
  expect(popup.style.maxWidth).toBe('280px')
  expect(popup.querySelector('.maplibregl-popup-close-button')).toBeNull()
})
