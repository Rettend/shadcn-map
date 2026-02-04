export type OpeningHoursMode = 'twentyfour_seven' | 'custom'

export interface LocationItem {
  id: string
  name: string
  address: string
  city: string
  lngLat: [number, number]

  // Attributes (for filtering + display)
  score: number
  capacity: number

  hasParking: boolean
  hasWifi: boolean
  isPetFriendly: boolean

  openingHours: {
    mode: OpeningHoursMode
    // Only used when mode === 'custom' (minutes since midnight)
    openMinutes?: number
    closeMinutes?: number
  }
}

export const LOCATIONS_DATA: LocationItem[] = [
  {
    id: 'bp-1',
    name: 'Central Station Hub',
    address: 'Váci út 99.',
    city: 'Budapest',
    lngLat: [19.0677, 47.5296],
    score: 8.5,
    capacity: 120,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: false,
    openingHours: { mode: 'twentyfour_seven' },
  },
  {
    id: 'bp-2',
    name: 'Riverside Point',
    address: 'Fehérvári út 25.',
    city: 'Budapest',
    lngLat: [19.0289, 47.4699],
    score: 9.2,
    capacity: 80,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 360, closeMinutes: 1320 }, // 06:00-22:00
  },
  {
    id: 'bp-3',
    name: 'Hillside Center',
    address: 'Bécsi út 56.',
    city: 'Budapest',
    lngLat: [19.0314, 47.5488],
    score: 7.8,
    capacity: 50,
    hasParking: false,
    hasWifi: true,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 420, closeMinutes: 1260 }, // 07:00-21:00
  },
  {
    id: 'bp-4',
    name: 'Eastside Plaza',
    address: 'Pesti út 237.',
    city: 'Budapest',
    lngLat: [19.2634, 47.4796],
    score: 8.0,
    capacity: 200,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: false,
    openingHours: { mode: 'twentyfour_seven' },
  },
  {
    id: 'bp-5',
    name: 'North Gate',
    address: 'Árpád út 183.',
    city: 'Budapest',
    lngLat: [19.0833, 47.5763],
    score: 6.5,
    capacity: 30,
    hasParking: true,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 420, closeMinutes: 1320 }, // 07:00-22:00
  },
  {
    id: 'bp-6',
    name: 'South Park',
    address: 'Üllői út 121.',
    city: 'Budapest',
    lngLat: [19.1017, 47.4690],
    score: 7.2,
    capacity: 60,
    hasParking: false,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 480, closeMinutes: 1260 }, // 08:00-21:00
  },
  {
    id: 'bp-7',
    name: 'West End Corner',
    address: 'Margit körút 42.',
    city: 'Budapest',
    lngLat: [19.0378, 47.5136],
    score: 9.5,
    capacity: 40,
    hasParking: true,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 480, closeMinutes: 1200 }, // 08:00-20:00
  },
  {
    id: 'bp-8',
    name: 'City Park Spot',
    address: 'Hungária krt. 127.',
    city: 'Budapest',
    lngLat: [19.1088, 47.5057],
    score: 8.8,
    capacity: 150,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: true,
    openingHours: { mode: 'twentyfour_seven' },
  },
  {
    id: 'bp-9',
    name: 'Suburban Outpost',
    address: 'Veres Péter út 43.',
    city: 'Budapest',
    lngLat: [19.1771, 47.5147],
    score: 7.0,
    capacity: 45,
    hasParking: false,
    hasWifi: true,
    isPetFriendly: false,
    openingHours: { mode: 'custom', openMinutes: 420, closeMinutes: 1380 }, // 07:00-23:00
  },
  {
    id: 'bp-10',
    name: 'Island Gateway',
    address: 'II. Rákóczi Ferenc út 191.',
    city: 'Budapest',
    lngLat: [19.0718, 47.4317],
    score: 8.1,
    capacity: 90,
    hasParking: true,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 360, closeMinutes: 1320 }, // 06:00-22:00
  },
  {
    id: 'buda-1',
    name: 'Budaörs Complex',
    address: 'Kinizsi út 12.',
    city: 'Budaörs',
    lngLat: [18.9557, 47.4593],
    score: 9.0,
    capacity: 300,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: true,
    openingHours: { mode: 'twentyfour_seven' },
  },
  {
    id: 'szi-1',
    name: 'Sziget Center',
    address: 'Csepeli út 26.',
    city: 'Szigetszentmiklós',
    lngLat: [19.0475, 47.3433],
    score: 7.5,
    capacity: 110,
    hasParking: true,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 420, closeMinutes: 1260 }, // 07:00-21:00
  },
  {
    id: 'erd-1',
    name: 'Érd Station',
    address: 'Budai út 18.',
    city: 'Érd',
    lngLat: [18.9217, 47.3924],
    score: 6.8,
    capacity: 70,
    hasParking: false,
    hasWifi: false,
    isPetFriendly: true,
    openingHours: { mode: 'custom', openMinutes: 480, closeMinutes: 1200 }, // 08:00-20:00
  },
  {
    id: 'vec-1',
    name: 'Airport Zone',
    address: 'Fő út 88.',
    city: 'Vecsés',
    lngLat: [19.2751, 47.4114],
    score: 8.4,
    capacity: 180,
    hasParking: true,
    hasWifi: false,
    isPetFriendly: false,
    openingHours: { mode: 'custom', openMinutes: 420, closeMinutes: 1260 }, // 07:00-21:00
  },
  {
    id: 'god-1',
    name: 'Danube Bend Point',
    address: 'Duna sor 5.',
    city: 'Göd',
    lngLat: [19.1366, 47.6874],
    score: 9.1,
    capacity: 65,
    hasParking: true,
    hasWifi: true,
    isPetFriendly: true,
    openingHours: { mode: 'twentyfour_seven' },
  },
]

export const locations = $state.raw<LocationItem[]>([...LOCATIONS_DATA])
