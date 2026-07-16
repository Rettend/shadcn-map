import { describe, expect, test } from 'bun:test'
import { buildBadgeSvgMarkup, resolveBadgeVisual, resolveMarkerBadgeLayout } from './badge-visual'
import { getMarkerBadgeHitCircles } from './marker-layer-image'

describe('marker badge visuals', () => {
  test('prefers inline svg badges when svgBody is provided', () => {
    const visual = resolveBadgeVisual({
      icon: 'i-ph:broom-duotone',
      svgBody: '<path d="M0 0h24v24H0z"/>',
      svgWidth: 24,
      svgHeight: 24,
    })

    expect(visual.kind).toBe('svg')
    if (visual.kind !== 'svg')
      throw new Error('Expected svg visual')

    expect(visual.svgMarkup).toContain('<svg')
    expect(visual.svgMarkup).toContain('viewBox="0 0 24 24"')
    expect(visual.svgMarkup).toContain('<path d="M0 0h24v24H0z"/>')
  })

  test('falls back to legacy icon classes when no svgBody is provided', () => {
    const visual = resolveBadgeVisual({
      icon: 'i-ph:number-two-bold',
    })

    expect(visual).toEqual({
      kind: 'icon',
      icon: 'i-ph:number-two-bold',
    })
  })

  test('buildBadgeSvgMarkup wraps trusted body markup in a full svg element', () => {
    expect(buildBadgeSvgMarkup('<circle cx="12" cy="12" r="10"/>', 24, 24))
      .toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true" style="display:block"><circle cx="12" cy="12" r="10"/></svg>')
  })

  test('collapses same-position badges into a count and preserves other positions', () => {
    const layout = resolveMarkerBadgeLayout([
      { icon: 'i-ph:car-fill', color: 'bg-blue-600', label: 'Parking' },
      { icon: 'i-ph:wifi-high-bold', color: 'bg-red-600', label: 'Wi-Fi' },
      { icon: 'i-ph:paw-print-fill', position: 'bottom-left', label: 'Pet friendly' },
    ])

    expect(layout.collapsed).toHaveLength(2)
    expect(layout.collapsed[0]).toMatchObject({
      position: 'top-right',
      icon: 'i-ph:number-two-bold',
      count: 2,
      label: 'Parking, Wi-Fi',
    })
    expect(layout.collapsed[1]).toMatchObject({
      position: 'bottom-left',
      icon: 'i-ph:paw-print-fill',
      count: 1,
    })
    expect(layout.expanded.map(badge => badge.icon)).toEqual(['i-ph:car-fill', 'i-ph:wifi-high-bold'])
  })

  test('caps collapsed badge counts at nine', () => {
    const layout = resolveMarkerBadgeLayout(Array.from({ length: 11 }, (_, index) => ({ label: `Badge ${index + 1}` })))

    expect(layout.collapsed[0]).toMatchObject({
      icon: 'i-ph:number-nine-bold',
      count: 11,
    })
    expect(layout.collapsed[0]?.label).toContain('(+2 more)')
    expect(layout.expanded).toHaveLength(11)
  })

  test('uses the rendered badge geometry for collapsed and expanded hit targets', () => {
    const badges = [
      { icon: 'i-ph:car-fill' },
      { icon: 'i-ph:wifi-high-bold' },
      { icon: 'i-ph:paw-print-fill' },
    ]

    expect(getMarkerBadgeHitCircles('md', badges)).toEqual([
      { x: 15, y: -15, radius: 10, label: '' },
    ])
    expect(getMarkerBadgeHitCircles('md', badges, true)).toEqual([
      { x: 15, y: -15, radius: 10, label: '' },
      { x: 39, y: -15, radius: 10, label: '' },
      { x: 63, y: -15, radius: 10, label: '' },
    ])
  })
})
