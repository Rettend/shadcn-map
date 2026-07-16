<script lang='ts'>
  import type { LocationItem } from '$lib/data/markers.svelte'
  import type { MapLibreMap, MarkerBadge, MarkerIcon, MarkerLayerPoint } from 'shadcn-map'

  import DesktopSidebar from '$lib/components/locator/DesktopSidebar.svelte'
  import MobilePanel from '$lib/components/locator/MobilePanel.svelte'
  import { locations } from '$lib/data/markers.svelte'
  import { createLocationsStore } from '$lib/stores/markers.svelte'
  import { GeolocateControl, Map as MapView, Marker, MarkerLayer, NavigationControl, Popup, ScaleControl } from 'shadcn-map'

  const store = createLocationsStore(locations)
  let mapRef = $state<MapLibreMap | null>(null)

  const locationMarkerIcons = {
    pin: { svgBody: '<path fill="currentColor" d="M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32"/>' },
    car: { svgBody: '<path fill="currentColor" d="M240 112v96a8 8 0 0 1-8 8h-16a24 24 0 0 1-24-24v-8H64v8a24 24 0 0 1-24 24H24a8 8 0 0 1-8-8v-96l25.06-56.4A24 24 0 0 1 63 40h130a24 24 0 0 1 21.94 14.6Zm-188.3-8h152.6l-18.66-42H70.36ZM64 144a12 12 0 1 0-12 12a12 12 0 0 0 12-12m152 0a12 12 0 1 0-12 12a12 12 0 0 0 12-12"/>' },
    wifi: { svgBody: '<path fill="currentColor" d="M140 204a12 12 0 1 1-12-12a12 12 0 0 1 12 12M237.08 87A172 172 0 0 0 18.92 87A12 12 0 0 0 34.1 105.6a148 148 0 0 1 187.8 0A12 12 0 0 0 237.08 87M128 112a108 108 0 0 0-68.69 24.55a12 12 0 0 0 15.27 18.51a84 84 0 0 1 106.84 0a12 12 0 0 0 15.27-18.51A108 108 0 0 0 128 112m0 56a52 52 0 0 0-34.15 12.77a12 12 0 0 0 15.8 18.07a28 28 0 0 1 36.7 0a12 12 0 1 0 15.8-18.07A52 52 0 0 0 128 168"/>' },
    paw: { svgBody: '<path fill="currentColor" d="M212 84a28 28 0 1 1-28-28a28 28 0 0 1 28 28M72 112a28 28 0 1 0-28-28a28 28 0 0 0 28 28m56-8a32 32 0 1 0-32-32a32 32 0 0 0 32 32m57.07 64c-14.89-17-36.74-40-57.07-40s-42.18 23-57.07 40C58.33 182.35 48 197.69 48 211.65c0 10.59 8.72 28.35 41.19 28.35c15.66 0 28.72-6.5 38.81-6.5s23.15 6.5 38.81 6.5c32.47 0 41.19-17.76 41.19-28.35c0-13.96-10.33-29.3-22.93-43.65"/>' },
    star: { svgBody: '<path fill="currentColor" d="M239.2 97.4A16.4 16.4 0 0 0 224.6 83l-59.4-4.1l-22-55.5A16.4 16.4 0 0 0 128 13a16.4 16.4 0 0 0-15.2 10.4l-22 55.5L31.4 83a16.5 16.5 0 0 0-14.6 14.4A16.8 16.8 0 0 0 26 114l45.7 38.4l-14.4 58a16.8 16.8 0 0 0 6.1 17.3a16.5 16.5 0 0 0 18.4.6l46.2-31.7l46.2 31.7a16.5 16.5 0 0 0 18.4-.6a16.8 16.8 0 0 0 6.1-17.3l-14.4-58L230 114a16.8 16.8 0 0 0 9.2-16.6"/>' },
  } satisfies Record<string, MarkerIcon>

  let isMobile = $state(false)
  const hungaryBounds: [[number, number], [number, number]] = [[16.1, 45.72], [22.93, 48.62]]
  const tileBounds: [[number, number], [number, number]] = [[16.0, 45.7], [23.0, 48.7]]
  const svgBadgeExample: { lngLat: [number, number], badges: MarkerBadge[] } = {
    lngLat: [19.0556, 47.4974],
    badges: [
      {
        svgBody: '<path d="M128 20l30.9 62.7 69.1 10-50 48.7 11.8 69-61.8-32.5-61.8 32.5 11.8-69-50-48.7 69.1-10z"></path>',
        svgWidth: 256,
        svgHeight: 256,
        color: 'bg-violet-600',
        label: 'Inline SVG badge',
        position: 'top-right',
      },
      {
        icon: 'i-ph:flask-fill',
        color: 'bg-sky-600',
        label: 'Legacy icon badge',
        position: 'bottom-left',
      },
    ],
  }

  function getLocationMarkerIcon(location: LocationItem): MarkerIcon {
    if (location.hasParking && location.hasWifi && location.isPetFriendly)
      return locationMarkerIcons.star
    if (location.hasParking && !location.hasWifi)
      return locationMarkerIcons.car
    if (location.hasWifi && !location.hasParking)
      return locationMarkerIcons.wifi
    if (location.isPetFriendly && !location.hasParking && !location.hasWifi)
      return locationMarkerIcons.paw
    return locationMarkerIcons.pin
  }

  function updateViewportFromMap() {
    if (!mapRef)
      return
    const c = mapRef.getCenter()
    store.mapCenter = [c.lng, c.lat]
    const b = mapRef.getBounds()
    store.mapBounds = {
      sw: [b.getWest(), b.getSouth()],
      ne: [b.getEast(), b.getNorth()],
    }
  }

  function getCameraOffsetPx(map: MapLibreMap): [number, number] {
    const container = map.getContainer()
    const w = container.clientWidth
    const h = container.clientHeight

    if (isMobile) {
      const drawerH = store.drawerCollapsed
        ? 52 + 12
        : (store.drawerExpanded ? 0.6 : 0.3) * h + 12
      return [0, -drawerH / 2]
    }

    const sidebarW = Math.min(w * 0.92, 380) + 12
    return [sidebarW / 2, 0]
  }

  function getFitPaddingPx(map: MapLibreMap) {
    const container = map.getContainer()
    const w = container.clientWidth
    const h = container.clientHeight

    if (isMobile) {
      const bottom = store.drawerCollapsed
        ? 96
        : Math.round((store.drawerExpanded ? 0.6 : 0.3) * h + 24)
      return { top: 80, left: 24, right: 24, bottom }
    }

    const sidebarW = Math.min(w * 0.92, 380)
    return { top: 80, left: Math.round(sidebarW + 48), right: 24, bottom: 80 }
  }

  function getInitialCountryFitPaddingPx(map: MapLibreMap) {
    const container = map.getContainer()
    const w = container.clientWidth
    const h = container.clientHeight
    const mobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

    if (mobileViewport) {
      return { top: 72, left: 20, right: 20, bottom: Math.round(0.3 * h + 24) }
    }

    const sidebarW = Math.min(w * 0.92, 380)
    return { top: 72, left: Math.round(sidebarW + 48), right: 24, bottom: 72 }
  }

  function fitHungaryForInitialViewport(map: MapLibreMap) {
    map.fitBounds(hungaryBounds, {
      padding: getInitialCountryFitPaddingPx(map),
      duration: 0,
    })
  }

  function applyDynamicCameraLimits(map: MapLibreMap) {
    const mobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

    fitHungaryForInitialViewport(map)

    const fittedZoom = map.getZoom()
    const minZoom = Math.floor((mobileViewport ? Math.max(fittedZoom, 5.6) : fittedZoom) * 1000) / 1000
    map.setMinZoom(minZoom)
    if (map.getZoom() < minZoom) {
      map.jumpTo({ zoom: minZoom })
    }

    const vp = map.getBounds()
    const vpLngSpan = vp.getEast() - vp.getWest()
    const vpLatSpan = vp.getNorth() - vp.getSouth()
    const tileLngSpan = tileBounds[1][0] - tileBounds[0][0]
    const halfExcessLng = Math.max(0, (vpLngSpan - tileLngSpan) / 2)

    const westExtra = mobileViewport ? 0.6 : 0.75
    const eastExtra = 1.0
    const northBound = tileBounds[1][1] + 0.21
    const desktopVerticalSlack = Math.max(0.14, Math.min(0.42, 0.42 - (vpLatSpan - 3.35) * 1.1))
    const verticalSlack = mobileViewport ? 0.12 : desktopVerticalSlack
    const southBound = Math.min(
      northBound - vpLatSpan - verticalSlack,
      tileBounds[0][1] - 0.2,
    )

    map.setMaxBounds([
      [tileBounds[0][0] - (halfExcessLng + westExtra), southBound],
      [tileBounds[1][0] + (halfExcessLng + eastExtra), northBound],
    ])
  }

  function centerOnId(id: string, zoom = 15) {
    store.selectedId = id
    const loc = store.all.find(w => w.id === id)
    if (!loc || !mapRef)
      return

    mapRef.easeTo({
      center: loc.lngLat,
      zoom,
      duration: 450,
      offset: getCameraOffsetPx(mapRef),
    })
  }

  function openDetailsForId(id: string) {
    centerOnId(id, 15)
    if (isMobile) {
      store.drawerMode = 'details'
      store.drawerExpanded = true
      store.drawerCollapsed = false
    }
  }

  function selectLocationMarker(id: string, lngLat: [number, number]) {
    store.selectedId = id
    if (isMobile) {
      ensureVisibleWhenOpeningMobileDrawer(lngLat)
      store.drawerMode = 'details'
      store.drawerExpanded = true
      store.drawerCollapsed = false
    }
  }

  function closeDetailsMobile() {
    store.drawerMode = 'browse'
    store.drawerExpanded = false
    store.drawerCollapsed = false
    store.selectedId = null
  }

  function backDesktop() {
    store.selectedId = null
  }

  function handleSearchSubmit() {
    if (!mapRef)
      return
    if (store.results.length === 0)
      return
    if (store.results.length === 1) {
      mapRef.easeTo({
        center: store.results[0]!.lngLat,
        zoom: 13,
        duration: 500,
        offset: getCameraOffsetPx(mapRef),
      })
      return
    }

    let minLng = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY
    for (const r of store.results) {
      minLng = Math.min(minLng, r.lngLat[0])
      minLat = Math.min(minLat, r.lngLat[1])
      maxLng = Math.max(maxLng, r.lngLat[0])
      maxLat = Math.max(maxLat, r.lngLat[1])
    }

    mapRef.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: getFitPaddingPx(mapRef),
        duration: 550,
        maxZoom: 13,
      },
    )
  }

  $effect(() => {
    if (typeof window === 'undefined')
      return
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => {
      isMobile = media.matches
      if (mapRef) {
        applyDynamicCameraLimits(mapRef)
        updateViewportFromMap()
      }
      if (!isMobile) {
        store.drawerMode = 'browse'
        store.drawerExpanded = false
      }
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  })

  const selected = $derived.by(() => store.all.find(w => w.id === store.selectedId) ?? null)
  const layerMarkers = $derived<MarkerLayerPoint[]>(store.filtered.map(location => ({
    id: location.id,
    lngLat: location.lngLat,
    label: location.name,
    color: '#2563eb',
    icon: getLocationMarkerIcon(location),
  })))

  function handleSelectedMarkerClick() {
    const location = selected
    if (location) {
      selectLocationMarker(location.id, location.lngLat)
    }
  }

  function ensureVisibleWhenOpeningMobileDrawer(lngLat: [number, number]) {
    if (!isMobile || !mapRef) {
      return
    }

    const container = mapRef.getContainer()
    const h = container.clientHeight
    const drawerH = 0.6 * h + 12 // drawer is opening to 60vh + bottom margin

    const p = mapRef.project(lngLat)
    const gap = 48
    const safeBottom = h - drawerH - gap
    if (p.y <= safeBottom) {
      return
    }

    const delta = p.y - safeBottom
    // Move the map just enough so the marker ends up above the opening drawer.
    mapRef.panBy([0, delta], { duration: 260 })
  }

  const markerBadgesById = $derived.by(() => {
    const map = new Map<string, MarkerBadge[]>()
    for (const w of store.filtered) {
      const badges: MarkerBadge[] = []
      if (w.hasParking)
        badges.push({ icon: 'i-ph:car-fill', color: 'bg-blue-600', label: 'Parking', position: 'top-right' })
      if (w.hasWifi)
        badges.push({ icon: 'i-ph:wifi-high-bold', color: 'bg-red-600', label: 'Wi-Fi', position: 'top-right' })
      if (w.isPetFriendly)
        badges.push({ icon: 'i-ph:paw-print-fill', color: 'bg-emerald-600', label: 'Pet Friendly', position: 'top-right' })
      map.set(w.id, badges)
    }
    return map
  })

  $effect(() => {
    const selectedId = store.selectedId
    if (selectedId && !store.filtered.some(location => location.id === selectedId)) {
      store.selectedId = null
      if (isMobile) {
        store.drawerMode = 'browse'
        store.drawerExpanded = false
        store.drawerCollapsed = false
      }
    }
  })
</script>

<div
  class={`controls-host h-full w-full relative ${isMobile ? 'is-mobile' : ''}`}
  style={`--mobile-controls-bottom: ${
    isMobile
      ? (store.drawerCollapsed ? '56px' : (store.drawerExpanded ? '60vh' : '30vh'))
      : '0px'
  };`}
>
  <div class='px-3 py-2 border rounded-lg bg-background/92 w-[min(22rem,calc(100%-1.5rem))] pointer-events-none shadow-lg left-1/2 top-3 absolute z-10 backdrop-blur -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4'>
    <p class='text-sm font-medium'>GPU icons + DOM escape hatch</p>
    <p class='text-xs text-muted-foreground'>Blue markers use varied layer icons. The purple star is a DOM marker with an inline SVG badge.</p>
  </div>

  <!-- tiles='/hungary.pmtiles' -->
  <MapView
    tiles='https://map.splaash.hu/hungary.pmtiles'
    center={[19.0402, 47.4979]}
    zoom={12}
    maxZoom={15}
    labels='roads'
    onload={(m) => {
      mapRef = m
      applyDynamicCameraLimits(m)
      updateViewportFromMap()
    }}
    onmoveend={() => updateViewportFromMap()}
    onclick={() => {
      if (isMobile) {
        // Map click on mobile closes details mode.
        if (store.drawerMode === 'details') {
          closeDetailsMobile()
          store.selectedId = null
        }
      }
      else {
        store.selectedId = null
      }
    }}
  >
    <Marker
      lngLat={svgBadgeExample.lngLat}
      color='bg-violet-700 dark:bg-violet-700'
      textColor='text-white'
      ringColor='ring-violet-500/45'
      size='lg'
      icon='i-ph:star-four-fill'
      label='SVG badge example'
      badges={svgBadgeExample.badges}
      active
      clusterable={false}
    />

    <MarkerLayer
      points={layerMarkers}
      hiddenId={selected?.id ?? null}
      onclick={(point) => {
        selectLocationMarker(String(point.id), point.lngLat)
      }}
    />

    {#if selected}
      <Marker
        lngLat={selected.lngLat}
        color='bg-[#2563eb] dark:bg-[#2563eb]'
        textColor='text-white'
        ringColor='ring-blue-500/50'
        icon={getLocationMarkerIcon(selected)}
        label={selected.name}
        badges={markerBadgesById.get(selected.id) ?? []}
        active
        clusterable={false}
        onclick={handleSelectedMarkerClick}
      />
    {/if}

    {#if !isMobile && selected}
      <Popup
        lngLat={selected.lngLat}
        open
        closeOnClick={false}
        onclose={() => {
          store.selectedId = null
        }}
      >
        <div class='text-sm font-semibold'>{selected.name}</div>
        <div class='text-xs text-muted-foreground'>{selected.address}, {selected.city}</div>
      </Popup>
    {/if}

    <NavigationControl position='bottom-right' />
    <GeolocateControl
      position='bottom-right'
      zoom={14}
      onlocate={() => updateViewportFromMap()}
    />
    <ScaleControl position='bottom-left' />
  </MapView>

  {#if isMobile}
    <MobilePanel
      store={store}
      results={store.results}
      selected={selected}
      onSelect={id => centerOnId(id, 14)}
      onCloseDetails={closeDetailsMobile}
      onSearchSubmit={handleSearchSubmit}
      onQueryChange={q => (store.query = q)}
      onFiltersChange={f => (store.filters = f)}
      onToggleExpanded={() => {
        // Expand toggles 30% <-> 60%. If the panel is collapsed, restore it to the default 30% state.
        if (store.drawerCollapsed) {
          store.drawerCollapsed = false
          store.drawerExpanded = false
          return
        }
        store.drawerExpanded = !store.drawerExpanded
      }}
    />
  {:else}
    <DesktopSidebar
      store={store}
      results={store.results}
      selected={selected}
      onSelect={id => openDetailsForId(id)}
      onBack={backDesktop}
      onSearchSubmit={handleSearchSubmit}
      onQueryChange={q => (store.query = q)}
      onFiltersChange={f => (store.filters = f)}
    />
  {/if}
</div>

<style>
  :global(.controls-host.is-mobile .shadcn-map .maplibregl-ctrl-bottom-left),
  :global(.controls-host.is-mobile .shadcn-map .maplibregl-ctrl-bottom-right) {
    bottom: calc(var(--mobile-controls-bottom) + 20px);
  }
</style>
