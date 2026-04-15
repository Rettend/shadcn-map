import { describe, expect, test } from 'bun:test'
import { buildBadgeSvgMarkup, resolveBadgeVisual } from './badge-visual'

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
})
