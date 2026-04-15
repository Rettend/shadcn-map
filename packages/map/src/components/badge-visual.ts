import type { MarkerBadge } from '../types'

export function buildBadgeSvgMarkup(body: string, width = 256, height = 256) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" fill="currentColor" aria-hidden="true" style="display:block">${body}</svg>`
}

export function resolveBadgeVisual(badge: Pick<MarkerBadge, 'icon' | 'svgBody' | 'svgWidth' | 'svgHeight'>) {
  if (badge.svgBody) {
    return {
      kind: 'svg' as const,
      svgMarkup: buildBadgeSvgMarkup(badge.svgBody, badge.svgWidth, badge.svgHeight),
    }
  }

  if (badge.icon) {
    return {
      kind: 'icon' as const,
      icon: badge.icon,
    }
  }

  return {
    kind: 'empty' as const,
  }
}
