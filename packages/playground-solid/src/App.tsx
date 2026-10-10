import type { MapLibreMap, MarkerBadge, MarkerIcon, MarkerLayerPoint } from 'shadcn-map/solid'
import {
  GeolocateControl,
  Map as MapView,
  Marker,
  MarkerLayer,
  NavigationControl,
  Popup,
  ScaleControl,
} from 'shadcn-map/solid'
import { createMemo, createSignal, For, Show } from 'solid-js'
import 'shadcn-map/solid.css'

interface Place {
  id: string
  name: string
  city: string
  address: string
  category: 'coffee' | 'culture' | 'outdoors'
  lngLat: [number, number]
  note: string
  wifi?: boolean
  parking?: boolean
  favorite?: boolean
}

const places: Place[] = [
  {
    id: 'castle',
    name: 'Buda Castle',
    city: 'Budapest',
    address: 'Szent Gyorgy ter 2',
    category: 'culture',
    lngLat: [19.0399, 47.4962],
    note: 'Hilltop courtyards and a wide Danube panorama.',
    parking: true,
    favorite: true,
  },
  {
    id: 'parliament',
    name: 'Hungarian Parliament',
    city: 'Budapest',
    address: 'Kossuth Lajos ter 1-3',
    category: 'culture',
    lngLat: [19.0457, 47.5071],
    note: 'Neo-Gothic landmark on the Pest riverbank.',
    favorite: true,
  },
  {
    id: 'margaret',
    name: 'Margaret Island',
    city: 'Budapest',
    address: 'Margitsziget',
    category: 'outdoors',
    lngLat: [19.0476, 47.5264],
    note: 'A calm green island for walking, running, and picnics.',
    parking: true,
  },
  {
    id: 'gellert',
    name: 'Gellert Hill',
    city: 'Budapest',
    address: 'Citadella setany',
    category: 'outdoors',
    lngLat: [19.0462, 47.4869],
    note: 'A steep walk rewarded by one of the best city views.',
  },
  {
    id: 'espresso',
    name: 'Madal Espresso',
    city: 'Budapest',
    address: 'Ferenciek tere 3',
    category: 'coffee',
    lngLat: [19.0553, 47.4928],
    note: 'Specialty coffee in a quiet central courtyard.',
    wifi: true,
    favorite: true,
  },
  {
    id: 'flow',
    name: 'Flow Coffee',
    city: 'Budapest',
    address: 'Andrassy ut 66',
    category: 'coffee',
    lngLat: [19.0656, 47.5068],
    note: 'Bright cafe with roastery coffee and plant-based food.',
    wifi: true,
  },
  {
    id: 'museum',
    name: 'Museum of Fine Arts',
    city: 'Budapest',
    address: 'Dozsa Gyorgy ut 41',
    category: 'culture',
    lngLat: [19.0779, 47.5158],
    note: 'European masters beside Heroes Square.',
    parking: true,
  },
  {
    id: 'kopaszi',
    name: 'Kopaszi Dam',
    city: 'Budapest',
    address: 'Kopaszi-gat',
    category: 'outdoors',
    lngLat: [19.0627, 47.4633],
    note: 'Modern riverside park with long waterside paths.',
    parking: true,
  },
  {
    id: 'kelet',
    name: 'Kelet Cafe',
    city: 'Budapest',
    address: 'Bartok Bela ut 29',
    category: 'coffee',
    lngLat: [19.0524, 47.4792],
    note: 'Bookshelves, coffee, and an easy neighborhood atmosphere.',
    wifi: true,
  },
  {
    id: 'aquincum',
    name: 'Aquincum Museum',
    city: 'Budapest',
    address: 'Szentendrei ut 135',
    category: 'culture',
    lngLat: [19.0507, 47.5631],
    note: 'Roman ruins from the ancient city beneath Budapest.',
    parking: true,
  },
]

const pinIcon: MarkerIcon = {
  svgBody:
    '<path fill="currentColor" d="M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32"/>',
}

const categoryLabel: Record<Place['category'], string> = {
  coffee: 'Coffee',
  culture: 'Culture',
  outdoors: 'Outdoors',
}

const categoryColor: Record<Place['category'], string> = {
  coffee: '#b45309',
  culture: '#2563eb',
  outdoors: '#15803d',
}

const uiIconPaths = {
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  search: 'M21 21l-4.3-4.3 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  chevron: 'm9 5 7 7-7 7',
  close: 'm6 6 12 12 M6 18 18 6',
}

function UiIcon(props: { name: keyof typeof uiIconPaths; class?: string }) {
  return (
    <svg
      class={['ui-icon', props.class]}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={uiIconPaths[props.name]} />
    </svg>
  )
}

const hungaryBounds: [[number, number], [number, number]] = [
  [16, 45.7],
  [23, 48.7],
]

function getBadges(place: Place): MarkerBadge[] {
  const badges: MarkerBadge[] = []
  if (place.wifi) {
    badges.push({
      svgBody:
        '<path fill="currentColor" d="M128 180a16 16 0 1 1-16 16a16 16 0 0 1 16-16m0-52a92 92 0 0 0-58.6 20.9l15.3 18.5a68 68 0 0 1 86.6 0l15.3-18.5A92 92 0 0 0 128 128m0-56a148 148 0 0 0-94 33.8l15.2 18.5a124 124 0 0 1 157.6 0l15.2-18.5A148 148 0 0 0 128 72"/>',
      color: 'badge-blue',
      textColor: 'badge-foreground',
      label: 'Wi-Fi',
    })
  }
  if (place.parking) {
    badges.push({
      svgBody:
        '<path fill="currentColor" d="M76 32h64a52 52 0 0 1 0 104h-40v72H76Zm24 24v56h40a28 28 0 0 0 0-56Z"/>',
      color: 'badge-amber',
      textColor: 'badge-foreground',
      label: 'Parking',
    })
  }
  if (place.favorite) {
    badges.push({
      svgBody:
        '<path fill="currentColor" d="m128 24l30 61l67 10l-48.5 47l11.5 67l-60-31.5L68 209l11.5-67L31 95l67-10Z"/>',
      color: 'badge-violet',
      textColor: 'badge-foreground',
      label: 'Local favorite',
    })
  }
  return badges
}

export function App() {
  const [map, setMap] = createSignal<MapLibreMap | null>(null)
  const [query, setQuery] = createSignal('')
  const [category, setCategory] = createSignal<Place['category'] | 'all'>('all')
  const [isDark, setIsDark] = createSignal(true)
  const [notice, setNotice] = createSignal<{ message: string; error: boolean } | null>(null)
  const [meetingPoint, setMeetingPoint] = createSignal<[number, number]>([19.068, 47.493])

  const filtered = createMemo(() => {
    const normalizedQuery = query().trim().toLowerCase()
    return places.filter(
      place =>
        (category() === 'all' || place.category === category()) &&
        (!normalizedQuery ||
          `${place.name} ${place.city} ${place.address}`.toLowerCase().includes(normalizedQuery)),
    )
  })
  const [selectedId, setSelectedId] = createSignal<string | null>((previous = 'castle') =>
    filtered().some(place => place.id === previous) ? previous : null,
  )
  const selected = createMemo(() => places.find(place => place.id === selectedId()) ?? null)
  const markerPoints = createMemo<MarkerLayerPoint[]>(() =>
    filtered().map(place => ({
      id: place.id,
      lngLat: place.lngLat,
      label: place.name,
      color: categoryColor[place.category],
      icon: pinIcon,
      badges: getBadges(place),
    })),
  )

  function selectPlace(place: Place) {
    setSelectedId(place.id)
    const mobile = window.matchMedia('(max-width: 640px)').matches
    map()?.easeTo({
      center: place.lngLat,
      zoom: 14,
      duration: 450,
      offset: mobile ? [0, -110] : [150, 0],
    })
  }

  function toggleTheme() {
    const nextDark = !isDark()
    document.documentElement.classList.toggle('dark', nextDark)
    setIsDark(nextDark)
  }

  function handleMapLoad(mapInstance: MapLibreMap) {
    mapInstance.setMaxBounds(hungaryBounds)
    setMap(mapInstance)
  }

  return (
    <main class="playground-shell">
      <MapView
        tiles="https://map.splaash.hu/hungary.pmtiles"
        center={[19.055, 47.501]}
        zoom={12}
        maxZoom={17}
        labels="roads"
        onload={handleMapLoad}
        onclick={() => setSelectedId(null)}
      >
        <MarkerLayer
          points={markerPoints()}
          hiddenId={selected()?.id ?? null}
          onclick={point => setSelectedId(String(point.id))}
        />

        <Marker
          lngLat={meetingPoint()}
          color="destructive"
          label="Drag this meeting point"
          draggable
          clusterable={false}
          ondragend={lngLat => {
            setMeetingPoint(lngLat)
            setNotice({
              message: `Meeting point: ${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`,
              error: false,
            })
          }}
        />

        <Show when={selected()}>
          {place => (
            <>
              <Marker
                lngLat={place().lngLat}
                color={`marker-${place().category}`}
                textColor="badge-foreground"
                icon={pinIcon}
                badges={getBadges(place())}
                label={place().name}
                active
              />
              <Popup
                lngLat={place().lngLat}
                open
                closeOnClick={false}
                onclose={() => setSelectedId(null)}
              >
                <strong>{place().name}</strong>
                <span class="popup-address">{place().address}</span>
              </Popup>
            </>
          )}
        </Show>

        <NavigationControl position="bottom-right" />
        <GeolocateControl
          position="bottom-right"
          onlocate={() => setNotice(current => (current?.error ? null : current))}
          onerror={error =>
            setNotice({
              message: error.message || 'Could not find your location. Try again.',
              error: true,
            })
          }
        />
        <ScaleControl position="bottom-left" />
      </MapView>

      <section class="locator-panel" aria-label="Budapest places">
        <header class="panel-header">
          <div>
            <p class="eyebrow">shadcn-map / Solid</p>
            <h1>Budapest field notes</h1>
          </div>
          <button
            class="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark() ? 'Use light theme' : 'Use dark theme'}
          >
            <UiIcon name={isDark() ? 'sun' : 'moon'} />
          </button>
        </header>

        <label class="search-field">
          <UiIcon name="search" class="search-icon" />
          <input
            value={query()}
            onInput={event => setQuery(event.currentTarget.value)}
            placeholder="Search places"
            aria-label="Search places"
          />
          <span class="result-count" aria-label={`${filtered().length} places`}>
            {filtered().length}
          </span>
        </label>

        <div class="category-tabs" aria-label="Filter by category">
          <For each={['all', 'coffee', 'culture', 'outdoors'] as const}>
            {value => (
              <button
                type="button"
                class={{ active: category() === value }}
                onClick={() => setCategory(value)}
                aria-pressed={category() === value ? 'true' : 'false'}
              >
                {value === 'all' ? 'All' : categoryLabel[value]}
              </button>
            )}
          </For>
        </div>

        <div class="results-list">
          <For each={filtered()} fallback={<p class="empty-state">No places match this search.</p>}>
            {place => (
              <button
                type="button"
                class={['place-card', { selected: selectedId() === place.id }]}
                onClick={() => selectPlace(place)}
                aria-pressed={selectedId() === place.id ? 'true' : 'false'}
              >
                <span class={['category-mark', place.category]} aria-hidden="true" />
                <span class="place-copy">
                  <strong>{place.name}</strong>
                  <small>{place.address}</small>
                  <span>{place.note}</span>
                </span>
                <UiIcon name="chevron" class="place-arrow" />
              </button>
            )}
          </For>
        </div>
      </section>

      <Show when={notice()}>
        {current => (
          <div class="notice" role={current().error ? 'alert' : 'status'}>
            <span>{current().message}</span>
            <button
              class="icon-button notice-dismiss"
              type="button"
              onClick={() => setNotice(null)}
              aria-label={current().error ? 'Dismiss location error' : 'Dismiss message'}
            >
              <UiIcon name="close" />
            </button>
          </div>
        )}
      </Show>
    </main>
  )
}
