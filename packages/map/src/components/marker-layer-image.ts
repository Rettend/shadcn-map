import type { BadgePosition, MarkerBadge, MarkerIcon, MarkerIconValue, MarkerSize } from '../types'
import type { ResolvedMarkerBadge } from './badge-visual'
import { resolveMarkerBadgeLayout } from './badge-visual'

export type MarkerLayerIcon = MarkerIcon
export type MarkerLayerIconValue = MarkerIconValue

export const markerVisualSizes: Record<MarkerSize, { diameter: number, iconSize: number, badgeSize: number, badgeIconSize: number, badgeOffset: number }> = {
  sm: { diameter: 28, iconSize: 16, badgeSize: 16, badgeIconSize: 10, badgeOffset: 6 },
  md: { diameter: 36, iconSize: 20, badgeSize: 20, badgeIconSize: 12, badgeOffset: 7 },
  lg: { diameter: 44, iconSize: 24, badgeSize: 24, badgeIconSize: 14, badgeOffset: 8 },
}

const defaultIconPath = 'M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32'

const defaultIcon: MarkerLayerIcon = {
  svgBody: `<path fill="currentColor" d="${defaultIconPath}"/>`,
  svgWidth: 256,
  svgHeight: 256,
}

const iconClassCache = new Map<string, Promise<MarkerLayerIcon | null>>()
const warnedIconClasses = new Set<string>()
const badgeColorCache = new Map<string, { background: string, foreground: string }>()

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function extractCssUrl(value: string) {
  const match = value.trim().match(/^url\((['"]?)(.*)\1\)$/)
  return match?.[2] ?? null
}

function decodeBase64Utf8(value: string) {
  const bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function readSvgUrl(url: string, signal: AbortSignal) {
  if (!url.startsWith('data:')) {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`Unable to load marker icon: ${response.status}`)
    }
    return response.text()
  }

  const separator = url.indexOf(',')
  if (separator < 0) {
    throw new Error('Invalid marker icon data URL.')
  }
  const metadata = url.slice(0, separator)
  const data = url.slice(separator + 1)
  return metadata.includes(';base64') ? decodeBase64Utf8(data) : decodeURIComponent(data)
}

function parseSvg(svg: string): MarkerLayerIcon | null {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || document.querySelector('parsererror')) {
    return null
  }

  const viewBox = root.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number)
  const width = viewBox?.[2] || Number.parseFloat(root.getAttribute('width') ?? '') || 256
  const height = viewBox?.[3] || Number.parseFloat(root.getAttribute('height') ?? '') || 256
  return {
    svgBody: root.innerHTML,
    svgWidth: width,
    svgHeight: height,
  }
}

async function resolveIconClass(iconClass: string) {
  const cached = iconClassCache.get(iconClass)
  if (cached) {
    return cached
  }

  const resolution = (async () => {
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 5_000)
    const element = document.createElement('span')
    try {
      element.className = iconClass
      element.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
      document.body.appendChild(element)

      const style = getComputedStyle(element)
      const mask = style.getPropertyValue('--un-icon') || style.maskImage || style.webkitMaskImage
      const url = extractCssUrl(mask)
      if (!url) {
        return null
      }
      return parseSvg(await readSvgUrl(url, abortController.signal))
    }
    finally {
      clearTimeout(timeoutId)
      element.remove()
    }
  })().catch(() => null)

  iconClassCache.set(iconClass, resolution)
  void resolution.then((resolved) => {
    if (!resolved && iconClassCache.get(iconClass) === resolution) {
      iconClassCache.delete(iconClass)
    }
  })
  return resolution
}

async function resolveOptionalIcon(icon?: MarkerLayerIconValue): Promise<MarkerLayerIcon | null> {
  if (!icon) {
    return null
  }
  if (typeof icon !== 'string') {
    return icon
  }

  const resolved = await resolveIconClass(icon)
  if (!resolved && !warnedIconClasses.has(icon)) {
    warnedIconClasses.add(icon)
    console.warn(`[shadcn-map] Could not resolve MarkerLayer icon class "${icon}". Ensure its generated CSS is included.`)
  }
  return resolved
}

async function resolveIcon(icon?: MarkerLayerIconValue) {
  return await resolveOptionalIcon(icon) ?? defaultIcon
}

function resolveBadgeColors(badge: ResolvedMarkerBadge) {
  const isDark = document.documentElement.classList.contains('dark')
  const cacheKey = `${isDark}:${badge.color}:${badge.textColor}`
  const cached = badgeColorCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const element = document.createElement('span')
  element.className = `${badge.color} ${badge.textColor}`
  element.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
  if (typeof CSS !== 'undefined' && CSS.supports('color', badge.color)) {
    element.style.backgroundColor = badge.color
  }
  if (typeof CSS !== 'undefined' && CSS.supports('color', badge.textColor)) {
    element.style.color = badge.textColor
  }
  document.body.appendChild(element)
  const style = getComputedStyle(element)
  const background = !style.backgroundColor || style.backgroundColor === 'rgba(0, 0, 0, 0)'
    ? '#3f3f46'
    : style.backgroundColor
  const foreground = !style.color || style.color === 'rgba(0, 0, 0, 0)'
    ? '#ffffff'
    : style.color
  element.remove()

  const resolved = { background, foreground }
  badgeColorCache.set(cacheKey, resolved)
  return resolved
}

function getBadgeCenter(position: BadgePosition, index: number, diameter: number, badgeSize: number, badgeOffset: number) {
  const horizontalDirection = position.endsWith('right') ? 1 : -1
  const verticalDirection = position.startsWith('top') ? -1 : 1
  const cornerOffset = diameter / 2 + badgeOffset - badgeSize / 2
  return {
    x: horizontalDirection * (cornerOffset + index * (badgeSize + 4)),
    y: verticalDirection * cornerOffset,
  }
}

function getDisplayedBadges(badges: MarkerBadge[], expanded: boolean) {
  const layout = resolveMarkerBadgeLayout(badges)
  return expanded
    ? [...layout.collapsed.filter(badge => badge.count === 1), ...layout.expanded]
    : layout.collapsed
}

export function getMarkerBadgeHitCircles(size: MarkerSize, badges: MarkerBadge[], expanded = false) {
  const { diameter, badgeSize, badgeOffset } = markerVisualSizes[size]
  return getDisplayedBadges(badges, expanded).map(badge => ({
    ...getBadgeCenter(badge.position, badge.index, diameter, badgeSize, badgeOffset),
    radius: badgeSize / 2,
    label: badge.label,
  }))
}

export interface CompositeMarkerImage {
  image: ImageData
  pixelRatio: number
}

interface MarkerImageOptions {
  size: MarkerSize
  color: string
  strokeColor: string
  icon?: MarkerLayerIconValue
  iconColor: string
  badges?: MarkerBadge[]
  badgeStrokeColor?: string
  expandedBadges?: boolean
}

function getMarkerImageLayout(options: MarkerImageOptions) {
  const config = markerVisualSizes[options.size]
  const badges = getDisplayedBadges(options.badges ?? [], options.expandedBadges ?? false).map(badge => ({
    badge,
    center: getBadgeCenter(badge.position, badge.index, config.diameter, config.badgeSize, config.badgeOffset),
    colors: resolveBadgeColors(badge),
  }))
  let halfWidth = config.diameter / 2
  let halfHeight = config.diameter / 2
  for (const { center } of badges) {
    halfWidth = Math.max(halfWidth, Math.abs(center.x) + config.badgeSize / 2 + 1)
    halfHeight = Math.max(halfHeight, Math.abs(center.y) + config.badgeSize / 2 + 1)
  }
  halfWidth = Math.ceil(halfWidth)
  halfHeight = Math.ceil(halfHeight)
  return {
    ...config,
    badges,
    canvasWidth: halfWidth * 2,
    canvasHeight: halfHeight * 2,
    markerX: halfWidth,
    markerY: halfHeight,
  }
}

export function createDefaultMarkerImage(options: MarkerImageOptions): CompositeMarkerImage {
  const pixelRatio = 2
  const layout = getMarkerImageLayout(options)
  const canvas = document.createElement('canvas')
  canvas.width = layout.canvasWidth * pixelRatio
  canvas.height = layout.canvasHeight * pixelRatio
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create the MarkerLayer fallback canvas.')
  }

  context.scale(pixelRatio, pixelRatio)
  context.beginPath()
  context.arc(layout.markerX, layout.markerY, layout.diameter / 2 - 1, 0, Math.PI * 2)
  context.fillStyle = options.color
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = options.strokeColor
  context.stroke()
  context.save()
  context.translate(layout.markerX - layout.iconSize / 2, layout.markerY - layout.iconSize / 2)
  context.scale(layout.iconSize / 256, layout.iconSize / 256)
  context.fillStyle = options.iconColor
  context.fill(new Path2D(defaultIconPath))
  context.restore()

  for (const { badge, center, colors } of layout.badges) {
    const badgeX = layout.markerX + center.x
    const badgeY = layout.markerY + center.y
    context.beginPath()
    context.arc(badgeX, badgeY, layout.badgeSize / 2 - 0.75, 0, Math.PI * 2)
    context.fillStyle = colors.background
    context.fill()
    context.lineWidth = 1.5
    context.strokeStyle = options.badgeStrokeColor ?? 'rgba(255, 255, 255, 0.3)'
    context.stroke()
    if (badge.count > 1) {
      context.fillStyle = colors.foreground
      context.font = `700 ${layout.badgeIconSize}px system-ui, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(String(Math.min(badge.count, 9)), badgeX, badgeY)
    }
  }

  return {
    image: context.getImageData(0, 0, canvas.width, canvas.height),
    pixelRatio,
  }
}

export async function createCompositeMarkerImage(options: MarkerImageOptions): Promise<CompositeMarkerImage> {
  const pixelRatio = 2
  const layout = getMarkerImageLayout(options)
  const icon = await resolveIcon(options.icon)
  const iconWidth = icon.svgWidth ?? 256
  const iconHeight = icon.svgHeight ?? 256
  const resolvedBadges = await Promise.all(layout.badges.map(async ({ badge, center, colors }) => {
    const badgeIcon: MarkerLayerIcon | null = badge.count > 1
      ? null
      : badge.svgBody
        ? { svgBody: badge.svgBody, svgWidth: badge.svgWidth, svgHeight: badge.svgHeight }
        : await resolveOptionalIcon(badge.icon)
    return {
      badge,
      badgeIcon,
      center,
      colors,
    }
  }))

  const markerIconX = layout.markerX - layout.iconSize / 2
  const markerIconY = layout.markerY - layout.iconSize / 2
  const badgeMarkup = resolvedBadges.map(({ badge, badgeIcon, center, colors }) => {
    const badgeX = layout.markerX + center.x
    const badgeY = layout.markerY + center.y
    const circle = `<circle cx="${badgeX}" cy="${badgeY}" r="${layout.badgeSize / 2 - 0.75}" fill="${escapeAttribute(colors.background)}" stroke="${escapeAttribute(options.badgeStrokeColor ?? 'rgba(255, 255, 255, 0.3)')}" stroke-width="1.5"/>`
    if (badge.count > 1) {
      return `${circle}<text x="${badgeX}" y="${badgeY}" fill="${escapeAttribute(colors.foreground)}" font-family="system-ui,sans-serif" font-size="${layout.badgeIconSize}" font-weight="700" text-anchor="middle" dominant-baseline="central">${Math.min(badge.count, 9)}</text>`
    }
    if (!badgeIcon) {
      return circle
    }
    const badgeIconWidth = badgeIcon.svgWidth ?? 256
    const badgeIconHeight = badgeIcon.svgHeight ?? 256
    return `${circle}<svg x="${badgeX - layout.badgeIconSize / 2}" y="${badgeY - layout.badgeIconSize / 2}" width="${layout.badgeIconSize}" height="${layout.badgeIconSize}" viewBox="0 0 ${badgeIconWidth} ${badgeIconHeight}" color="${escapeAttribute(colors.foreground)}" fill="currentColor">${badgeIcon.svgBody}</svg>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.canvasWidth * pixelRatio}" height="${layout.canvasHeight * pixelRatio}" viewBox="0 0 ${layout.canvasWidth} ${layout.canvasHeight}"><circle cx="${layout.markerX}" cy="${layout.markerY}" r="${layout.diameter / 2 - 1}" fill="${escapeAttribute(options.color)}" stroke="${escapeAttribute(options.strokeColor)}" stroke-width="2"/><svg x="${markerIconX}" y="${markerIconY}" width="${layout.iconSize}" height="${layout.iconSize}" viewBox="0 0 ${iconWidth} ${iconHeight}" color="${escapeAttribute(options.iconColor)}" fill="currentColor">${icon.svgBody}</svg>${badgeMarkup}</svg>`
  const image = new Image()
  let objectUrl: string | null = null
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const settle = (error?: Error) => {
        if (settled) {
          return
        }
        settled = true
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        error ? reject(error) : resolve()
      }

      timeoutId = setTimeout(() => settle(new Error('MarkerLayer icon rasterization timed out.')), 5_000)
      image.onload = () => settle()
      image.onerror = () => settle(new Error('Unable to rasterize the MarkerLayer icon.'))
      image.src = objectUrl!
    })

    const canvas = document.createElement('canvas')
    canvas.width = layout.canvasWidth * pixelRatio
    canvas.height = layout.canvasHeight * pixelRatio
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to create the MarkerLayer icon canvas.')
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return {
      image: context.getImageData(0, 0, canvas.width, canvas.height),
      pixelRatio,
    }
  }
  catch {
    return createDefaultMarkerImage(options)
  }
  finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    image.onload = null
    image.onerror = null
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  }
}
