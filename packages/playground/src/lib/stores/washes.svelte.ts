import type { WashLocation } from '../data/washes'

export type BooleanFilterKey = 'hasVacuum' | 'hasAutomatic' | 'hasCardPayment'
export type NumberFilterKey = 'baysMin' | 'priceMax'

export interface FiltersState {
  // Time filter: "open now"
  openNow: boolean

  // 3 boolean filters
  hasVacuum: boolean
  hasAutomatic: boolean
  hasCardPayment: boolean

  // 2 number filters
  baysMin: number | null
  priceMax: number | null
}

export type DrawerMode = 'browse' | 'details'

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes()
}

export function isOpenNow(location: WashLocation, now = new Date()) {
  if (location.openingHours.mode === 'twentyfour_seven') {
    return true
  }
  const open = location.openingHours.openMinutes ?? 0
  const close = location.openingHours.closeMinutes ?? 24 * 60
  const m = minutesSinceMidnight(now)

  // Handle overnight ranges like 20:00-05:00 (not in demo, but robust).
  if (close < open) {
    return m >= open || m <= close
  }
  return m >= open && m <= close
}

export function normalizeQuery(q: string) {
  return q.trim().toLowerCase()
}

export function matchesSearch(location: WashLocation, query: string) {
  const q = normalizeQuery(query)
  if (!q) {
    return true
  }

  const haystack = `${location.city} ${location.address} ${location.name}`.toLowerCase()
  return haystack.includes(q)
}

export function haversineMeters(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type WashResult = WashLocation & { distanceMeters: number | null, inView: boolean }

export class WashesStore {
  // input data
  all: WashLocation[]

  // view state
  selectedId = $state<string | null>(null)
  query = $state('')
  filters = $state<FiltersState>({
    openNow: false,
    hasVacuum: false,
    hasAutomatic: false,
    hasCardPayment: false,
    baysMin: null,
    priceMax: null,
  })

  drawerMode = $state<DrawerMode>('browse')
  drawerExpanded = $state(false)

  // map state (updated from Map events/context)
  mapCenter = $state<[number, number] | null>(null)
  mapBounds = $state<{ sw: [number, number], ne: [number, number] } | null>(null)

  // derived: filtered list based on query + filters
  filtered = $derived.by(() => {
    const now = new Date()
    return this.all.filter((l) => {
      if (!matchesSearch(l, this.query)) {
        return false
      }
      if (this.filters.openNow && !isOpenNow(l, now)) {
        return false
      }
      if (this.filters.hasVacuum && !l.hasVacuum) {
        return false
      }
      if (this.filters.hasAutomatic && !l.hasAutomatic) {
        return false
      }
      if (this.filters.hasCardPayment && !l.hasCardPayment) {
        return false
      }
      if (this.filters.baysMin !== null && l.bays < this.filters.baysMin) {
        return false
      }
      if (this.filters.priceMax !== null && l.pricePerWashHuf > this.filters.priceMax) {
        return false
      }
      return true
    })
  })

  // derived: sorted results with distance and in-view info
  results = $derived.by((): WashResult[] => {
    const mapBounds = this.mapBounds
    const mapCenter = this.mapCenter

    const inBounds = (lngLat: [number, number]) => {
      if (!mapBounds)
return false
      const [lng, lat] = lngLat
      return lng >= mapBounds.sw[0] && lng <= mapBounds.ne[0] && lat >= mapBounds.sw[1] && lat <= mapBounds.ne[1]
    }

    const list = this.filtered.map((l) => {
      const inView = inBounds(l.lngLat)
      const distanceMeters = mapCenter ? haversineMeters(mapCenter, l.lngLat) : null
      return { ...l, inView, distanceMeters }
    })

    // Default: nearby in-view first, then nearby out-of-view
    list.sort((a, b) => {
      if (a.inView !== b.inView) {
        return a.inView ? -1 : 1
      }
      const da = a.distanceMeters ?? Number.POSITIVE_INFINITY
      const db = b.distanceMeters ?? Number.POSITIVE_INFINITY
      return da - db
    })

    return list
  })

  constructor(initial: WashLocation[]) {
    this.all = initial
  }
}

export function createWashesStore(initial: WashLocation[]): WashesStore {
  return new WashesStore(initial)
}
