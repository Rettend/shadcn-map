<script lang='ts'>
  import type { MapLibreMap, MarkerBadge } from 'shadcn-map'

  import DesktopSidebar from '$lib/components/locator/DesktopSidebar.svelte'
  import MobilePanel from '$lib/components/locator/MobilePanel.svelte'
  import { locations } from '$lib/data/markers.svelte'
  import { createLocationsStore } from '$lib/stores/markers.svelte'
  import { GeolocateControl, Map as MapView, Marker, NavigationControl, Popup, ScaleControl } from 'shadcn-map'

  const store = createLocationsStore(locations)
  let mapRef = $state<MapLibreMap | null>(null)

  let isMobile = $state(false)

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
        ? (52 + 12) // header + bottom margin
        : ((store.drawerExpanded ? 0.6 : 0.3) * h + 12) // panel height + bottom margin
      return [0, -drawerH / 2]
    }

    // Desktop: left sidebar overlays the map; center within the remaining visible area.
    const sidebarW = Math.min(w * 0.92, 380) + 12 // width + left margin
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
      // When switching from mobile -> desktop, exit the mobile details mode.
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
</script>

<div
  class={`controls-host h-full w-full relative ${isMobile ? 'is-mobile' : ''}`}
  style={`--mobile-controls-bottom: ${
    isMobile
      ? (store.drawerCollapsed ? '56px' : (store.drawerExpanded ? '60vh' : '30vh'))
      : '0px'
  };`}
>
  <MapView
    tiles='https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles'
    center={[19.0402, 47.4979]}
    zoom={12}
    labels='roads'
    autoCluster
    autoClusterRadius={50}
    autoClusterMaxZoom={13}
    onload={(m) => {
      mapRef = m
      updateViewportFromMap()
    }}
    onmove={() => {
      updateViewportFromMap()
    }}
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
    {#each store.filtered as w (w.id)}
      <Marker
        lngLat={w.lngLat}
        color='bg-blue-600 dark:bg-blue-600'
        textColor='text-white'
        ringColor='ring-blue-500/50'
        icon='i-ph:map-pin-fill'
        label={w.name}
        badges={markerBadgesById.get(w.id) ?? []}
        active={store.selectedId === w.id}
        onclick={() => {
          store.selectedId = w.id
          if (isMobile) {
            ensureVisibleWhenOpeningMobileDrawer(w.lngLat)
            store.drawerMode = 'details'
            store.drawerExpanded = true
            store.drawerCollapsed = false
          }
        }}
      />
    {/each}

    {#if !isMobile && selected}
      <Popup
        lngLat={selected.lngLat}
        open
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
      onlocate={() => {
        // When we locate, refresh ordering.
        updateViewportFromMap()
      }}
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
  /* Mobile: the bottom drawer would cover map controls. Push bottom controls up to the top edge of the drawer. */
  :global(.controls-host.is-mobile .shadcn-map .maplibregl-ctrl-bottom-left),
  :global(.controls-host.is-mobile .shadcn-map .maplibregl-ctrl-bottom-right) {
    bottom: calc(var(--mobile-controls-bottom) + 20px);
  }
</style>
