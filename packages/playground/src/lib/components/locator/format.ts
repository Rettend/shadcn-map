import type { LocationItem } from '$lib/data/markers.svelte'

export function formatHuf(amount: number) {
  return `${amount.toLocaleString('hu-HU')} Ft`
}

export function formatDistance(meters: number | null) {
  if (meters === null || !Number.isFinite(meters)) {
    return ''
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatMinutes(m: number) {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

export function formatHours(location: LocationItem) {
  if (location.openingHours.mode === 'twentyfour_seven') {
    return '0-24'
  }
  const open = location.openingHours.openMinutes ?? 0
  const close = location.openingHours.closeMinutes ?? 24 * 60
  return `${formatMinutes(open)}–${formatMinutes(close)}`
}
