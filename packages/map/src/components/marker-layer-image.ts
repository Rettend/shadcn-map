import type { MarkerSize } from '../types'

export interface MarkerLayerIcon {
  /** Trusted SVG body markup, without the outer svg element. */
  svgBody: string
  /** SVG viewBox width. */
  svgWidth?: number
  /** SVG viewBox height. */
  svgHeight?: number
}

export type MarkerLayerIconValue = string | MarkerLayerIcon

export const markerVisualSizes: Record<MarkerSize, { diameter: number, iconSize: number }> = {
  sm: { diameter: 28, iconSize: 16 },
  md: { diameter: 36, iconSize: 20 },
  lg: { diameter: 44, iconSize: 24 },
}

const defaultIconPath = 'M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32'

const defaultIcon: MarkerLayerIcon = {
  svgBody: `<path fill="currentColor" d="${defaultIconPath}"/>`,
  svgWidth: 256,
  svgHeight: 256,
}

const iconClassCache = new Map<string, Promise<MarkerLayerIcon | null>>()
const warnedIconClasses = new Set<string>()

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

async function readSvgUrl(url: string) {
  if (!url.startsWith('data:')) {
    const response = await fetch(url)
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
    const element = document.createElement('span')
    element.className = iconClass
    element.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
    document.body.appendChild(element)

    const style = getComputedStyle(element)
    const mask = style.getPropertyValue('--un-icon') || style.maskImage || style.webkitMaskImage
    element.remove()

    const url = extractCssUrl(mask)
    if (!url) {
      return null
    }
    return parseSvg(await readSvgUrl(url))
  })().catch(() => null)

  iconClassCache.set(iconClass, resolution)
  void resolution.then((resolved) => {
    if (!resolved && iconClassCache.get(iconClass) === resolution) {
      iconClassCache.delete(iconClass)
    }
  })
  return resolution
}

async function resolveIcon(icon?: MarkerLayerIconValue) {
  if (!icon) {
    return defaultIcon
  }
  if (typeof icon !== 'string') {
    return icon
  }

  const resolved = await resolveIconClass(icon)
  if (resolved) {
    return resolved
  }
  if (!warnedIconClasses.has(icon)) {
    warnedIconClasses.add(icon)
    console.warn(`[shadcn-map] Could not resolve MarkerLayer icon class "${icon}". Ensure its generated CSS is included.`)
  }
  return defaultIcon
}

export interface CompositeMarkerImage {
  image: HTMLImageElement | ImageData
  pixelRatio: number
}

export function createDefaultMarkerImage(options: {
  size: MarkerSize
  color: string
  strokeColor: string
  iconColor: string
}): CompositeMarkerImage {
  const pixelRatio = 2
  const { diameter, iconSize } = markerVisualSizes[options.size]
  const canvas = document.createElement('canvas')
  canvas.width = diameter * pixelRatio
  canvas.height = diameter * pixelRatio
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create the MarkerLayer fallback canvas.')
  }

  context.scale(pixelRatio, pixelRatio)
  context.beginPath()
  context.arc(diameter / 2, diameter / 2, diameter / 2 - 1, 0, Math.PI * 2)
  context.fillStyle = options.color
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = options.strokeColor
  context.stroke()
  context.translate((diameter - iconSize) / 2, (diameter - iconSize) / 2)
  context.scale(iconSize / 256, iconSize / 256)
  context.fillStyle = options.iconColor
  context.fill(new Path2D(defaultIconPath))

  return {
    image: context.getImageData(0, 0, canvas.width, canvas.height),
    pixelRatio,
  }
}

export async function createCompositeMarkerImage(options: {
  size: MarkerSize
  color: string
  strokeColor: string
  icon?: MarkerLayerIconValue
  iconColor: string
}): Promise<CompositeMarkerImage> {
  const pixelRatio = 2
  const { diameter, iconSize } = markerVisualSizes[options.size]
  const icon = await resolveIcon(options.icon)
  const iconWidth = icon.svgWidth ?? 256
  const iconHeight = icon.svgHeight ?? 256
  const x = (diameter - iconSize) / 2
  const y = (diameter - iconSize) / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter * pixelRatio}" height="${diameter * pixelRatio}" viewBox="0 0 ${diameter} ${diameter}"><circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2 - 1}" fill="${escapeAttribute(options.color)}" stroke="${escapeAttribute(options.strokeColor)}" stroke-width="2"/><svg x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconWidth} ${iconHeight}" color="${escapeAttribute(options.iconColor)}">${icon.svgBody}</svg></svg>`
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to rasterize the MarkerLayer icon.'))
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
  }
  catch {
    return createDefaultMarkerImage(options)
  }

  return { image, pixelRatio }
}
