import type { BadgePosition, MarkerBadge } from '../types'

const numberIcons: Record<number, string> = {
  2: 'i-ph:number-two-bold',
  3: 'i-ph:number-three-bold',
  4: 'i-ph:number-four-bold',
  5: 'i-ph:number-five-bold',
  6: 'i-ph:number-six-bold',
  7: 'i-ph:number-seven-bold',
  8: 'i-ph:number-eight-bold',
  9: 'i-ph:number-nine-bold',
}

export interface ResolvedMarkerBadge extends MarkerBadge {
  position: BadgePosition
  color: string
  textColor: string
  label: string
  count: number
  index: number
  total: number
}

export interface MarkerBadgeLayout {
  collapsed: ResolvedMarkerBadge[]
  expanded: ResolvedMarkerBadge[]
}

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

export function resolveMarkerBadgeLayout(badges: MarkerBadge[]): MarkerBadgeLayout {
  const groups: Record<BadgePosition, MarkerBadge[]> = {
    'top-right': [],
    'top-left': [],
    'bottom-right': [],
    'bottom-left': [],
  }

  for (const badge of badges) {
    groups[badge.position ?? 'top-right'].push(badge)
  }

  const collapsed: ResolvedMarkerBadge[] = []
  const expanded: ResolvedMarkerBadge[] = []
  for (const [position, positionBadges] of Object.entries(groups) as [BadgePosition, MarkerBadge[]][]) {
    const firstBadge = positionBadges[0]
    if (!firstBadge) {
      continue
    }

    const count = positionBadges.length
    const allLabels = positionBadges
      .map(badge => badge.label)
      .filter(Boolean)
      .join(', ')
    collapsed.push({
      ...(count === 1 ? firstBadge : {}),
      position,
      icon: count === 1 ? firstBadge.icon : (numberIcons[Math.min(count, 9)] ?? numberIcons[9]),
      color: firstBadge.color ?? 'bg-zinc-700',
      textColor: firstBadge.textColor ?? 'text-white',
      label: count > 9 ? `${allLabels} (+${count - 9} more)` : (count === 1 ? (firstBadge.label ?? '') : allLabels),
      count,
      index: 0,
      total: count,
    })

    if (count > 1) {
      for (const [index, badge] of positionBadges.entries()) {
        expanded.push({
          ...badge,
          position,
          color: badge.color ?? 'bg-zinc-700',
          textColor: badge.textColor ?? 'text-white',
          label: index === 0 ? allLabels : (badge.label ?? ''),
          count: 1,
          index,
          total: count,
        })
      }
    }
  }

  return { collapsed, expanded }
}
