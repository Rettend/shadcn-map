<script lang='ts'>
  import type { MapLibreMap, MarkerBadge, MarkerLayerPoint } from 'shadcn-map'

  import DesktopSidebar from '$lib/components/locator/DesktopSidebar.svelte'
  import MobilePanel from '$lib/components/locator/MobilePanel.svelte'
  import { locations } from '$lib/data/markers.svelte'
  import { createLocationsStore } from '$lib/stores/markers.svelte'
  import { GeolocateControl, Map as MapView, Marker, MarkerLayer, NavigationControl, Popup, ScaleControl } from 'shadcn-map'

  const store = createLocationsStore(locations)
  let mapRef = $state<MapLibreMap | null>(null)

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
  })))

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
    <p class='text-sm font-medium'>SVG badge example</p>
    <p class='text-xs text-muted-foreground'>The highlighted purple marker near downtown Budapest renders its top-right badge from inline `svgBody` markup.</p>
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
        icon='i-ph:map-pin-fill'
        label={selected.name}
        badges={markerBadgesById.get(selected.id) ?? []}
        active
        clusterable={false}
        onclick={() => {
          selectLocationMarker(selected.id, selected.lngLat)
        }}
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
