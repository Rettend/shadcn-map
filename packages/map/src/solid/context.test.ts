import { describe, expect, test } from 'bun:test'
import { createEffect, createRoot, createSignal, flush } from 'solid-js'
import { createMapContext } from './context'

describe('Solid map context', () => {
  test('preserves marker writes queued in the same activity', () => {
    const { context, dispose } = createRoot(dispose => ({ context: createMapContext(), dispose }))
    try {
      context.registerMarker({ id: 'a', lngLat: [1, 2], clusterable: true, size: 'sm' })
      context.registerMarker({ id: 'b', lngLat: [3, 4], clusterable: true, size: 'md' })
      expect(context.markers.size).toBe(0)
      flush()

      expect(Array.from(context.markers.keys())).toEqual(['a', 'b'])

      context.updateMarker('a', { lngLat: [5, 6], size: 'lg' })
      context.unregisterMarker('b')
      context.setClusteredMarkers(new Set(['a']))
      context.setClusteredMarkers(new Set())
      flush()

      expect(context.markers.get('a')).toMatchObject({ lngLat: [5, 6], size: 'lg' })
      expect(context.markers.has('b')).toBe(false)
      expect(context.clusteredMarkerIds.size).toBe(0)
      expect(context.clusteredVersion).toBe(2)
    } finally {
      dispose()
    }
  })

  test('makes the map available to imperative helpers immediately', () => {
    const observedMaps: unknown[] = []
    const { context, dispose } = createRoot(dispose => {
      const context = createMapContext()
      createEffect(
        () => context.map,
        map => {
          observedMaps.push(map)
        },
      )
      return { context, dispose }
    })
    try {
      flush()
      const calls: unknown[] = []
      const map = {
        easeTo: (options: unknown) => calls.push(options),
      } as unknown as Parameters<typeof context.setMap>[0]

      context.setMap(map)
      context.flyTo([19.04, 47.5], { zoom: 12 })

      expect(context.map).toBeNull()
      expect(calls).toEqual([
        { center: [19.04, 47.5], zoom: 12, duration: undefined, easing: undefined },
      ])
      flush()
      expect(context.map).toBe(map)
      expect(observedMaps).toEqual([null, map])

      context.setMap(null)
      context.flyTo([0, 0])
      expect(calls).toHaveLength(1)
      flush()
      expect(context.map).toBeNull()
      expect(observedMaps).toEqual([null, map, null])
    } finally {
      dispose()
    }
  })

  test('restores the previous active popup when the newest closes', () => {
    const { context, dispose } = createRoot(dispose => ({ context: createMapContext(), dispose }))
    try {
      const first = Symbol('first')
      const second = Symbol('second')
      const sameMarker = Symbol('same-marker')

      context.setPopupMarker(first, 'a')
      flush()
      expect(context.activePopupMarkerId).toBe('a')

      context.setPopupMarker(second, 'b')
      flush()
      expect(context.activePopupMarkerId).toBe('b')

      context.clearPopupMarker(second)
      flush()
      expect(context.activePopupMarkerId).toBe('a')

      context.setPopupMarker(sameMarker, 'a')
      context.clearPopupMarker(first)
      flush()
      expect(context.activePopupMarkerId).toBe('a')

      context.clearPopupMarker(sameMarker)
      flush()
      expect(context.activePopupMarkerId).toBeNull()
    } finally {
      dispose()
    }
  })

  test('derives the context theme in the same update as the map theme', () => {
    const observations: unknown[] = []
    const { context, setMode, dispose } = createRoot(dispose => {
      const [mode, setMode] = createSignal<'dark' | 'light'>('light')
      const context = createMapContext(mode)
      createEffect(
        () => [mode(), context.resolvedMode],
        value => {
          observations.push(value)
        },
      )
      return { context, setMode, dispose }
    })
    try {
      flush()
      expect(context.resolvedMode).toBe('light')
      setMode('dark')
      flush()
      expect(observations).toEqual([
        ['light', 'light'],
        ['dark', 'dark'],
      ])
    } finally {
      dispose()
    }
  })
})
