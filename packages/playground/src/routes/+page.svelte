<script lang='ts'>
  import type { MarkerProps } from 'shadcn-map'
  import { DetailsPanel, Map, Marker, NavigationControl, Popup, ScaleControl } from 'shadcn-map'

  type Marker = MarkerProps & {
    id: number
    name: string
    description: string
    detailMode: 'popup' | 'panel'
  }

  // Demo marker locations
  const markers = [
    {
      id: 1,
      lngLat: [19.0456, 47.5071],
      name: 'Parliament',
      description: 'Gothic Revival landmark on the Danube.',
      color: 'bg-violet-500 dark:bg-violet-600',
      icon: 'i-ph:building-bold',
      detailMode: 'popup',
    },
    {
      id: 2,
      lngLat: [19.0437, 47.4989],
      name: 'Chain Bridge',
      description: 'Iconic suspension bridge linking Buda and Pest.',
      color: 'bg-sky-500 dark:bg-sky-600',
      icon: 'i-ph:bridge-bold',
      detailMode: 'popup',
    },
    {
      id: 3,
      lngLat: [19.0397, 47.4961],
      name: 'Buda Castle',
      description: 'Historic royal palace with sweeping views.',
      color: 'bg-green-500 dark:bg-green-600',
      icon: 'i-ph:castle-turret-bold',
      detailMode: 'panel',
    },
    {
      id: 4,
      lngLat: [19.0778, 47.5150],
      name: 'Heroes Square',
      description: 'Monumental square with statues and museums.',
      color: 'bg-orange-500 dark:bg-orange-600',
      icon: 'i-ph:park-bold',
      detailMode: 'panel',
    },
    {
      id: 5,
      lngLat: [19.2617, 47.4336],
      name: 'Airport',
      description: 'Budapest Ferenc Liszt International Airport.',
      color: 'bg-rose-500 dark:bg-rose-600',
      icon: 'i-ph:airplane-bold',
      detailMode: 'panel',
    },
    {
      id: 6,
      lngLat: [19.0818, 47.4734],
      name: 'Custom',
      description: 'Custom UnoCSS marker example.',
      color: 'bg-blue-800 dark:bg-blue-900',
      icon: 'i-custom:yuo',
      detailMode: 'popup',
    },
  ] satisfies Marker[]

  const clusterBase: [number, number] = [19.063, 47.515]
  const gridMarkers = Array.from({ length: 24 }, (_, index) => {
    const row = Math.floor(index / 6) - 2
    const col = (index % 6) - 3
    return {
      id: `grid-${index + 1}`,
      lngLat: [clusterBase[0] + col * 0.003, clusterBase[1] + row * 0.003],
    }
  }) satisfies Array<{ id: string, lngLat: [number, number] }>

  let selected = $state<Marker | null>(null)
  let suppressMapClick = $state(false)

  function markInteraction() {
    suppressMapClick = true
    queueMicrotask(() => {
      suppressMapClick = false
    })
  }

  function handleMapClick() {
    if (suppressMapClick) {
      return
    }
    selected = null
  }

  function handleMarkerClick(marker: Marker) {
    markInteraction()
    selected = marker
  }
</script>

<div class='h-full w-full relative'>
  <Map
    tiles='https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles'
    center={[19.0402, 47.4979]}
    zoom={12}
    onclick={handleMapClick}
    autoCluster
    autoClusterRadius={60}
    autoClusterMaxZoom={13}
  >
    {#each markers as marker (marker.id)}
      <Marker
        lngLat={marker.lngLat}
        color={marker.color}
        icon={marker.icon}
        label={marker.name}
        pulse={selected?.id === marker.id}
        onclick={() => handleMarkerClick(marker)}
      />
    {/each}

    {#each gridMarkers as marker (marker.id)}
      <Marker
        lngLat={marker.lngLat}
        color='bg-sky-500 dark:bg-sky-600'
        size='sm'
      />
    {/each}

    {#if selected?.detailMode === 'popup'}
      <Popup
        lngLat={selected.lngLat}
        open
        onclose={() => {
          selected = null
        }}
      >
        <div class='text-sm font-semibold'>{selected.name}</div>
        <div class='text-xs text-muted-foreground'>{selected.description}</div>
        <a
          href='https://www.google.com/maps/dir/?api=1&destination={selected.lngLat[1]},{selected.lngLat[0]}'
          target='_blank'
          rel='noopener noreferrer'
          class='text-xs text-primary-foreground px-2.5 py-1.5 rounded-md bg-primary inline-flex gap-1.5 transition-colors items-center hover:bg-primary/90'
        >
          <span class='i-ph-navigation'></span>
          Directions
        </a>
      </Popup>
    {/if}

    <NavigationControl position='bottom-right' />
    <ScaleControl position='bottom-left' />
  </Map>

  <DetailsPanel
    open={selected?.detailMode === 'panel'}
    ariaLabel={selected ? `${selected.name} details` : 'Details panel'}
    onclose={() => {
      selected = null
    }}
  >
    {#if selected?.detailMode === 'panel'}
      <div class='space-y-3'>
        <div>
          <h2 class='text-lg text-foreground font-semibold'>{selected.name}</h2>
          <p class='text-sm text-muted-foreground mt-1'>{selected.description}</p>
        </div>
        <div class='text-sm text-muted-foreground'>
          Coordinates: {selected.lngLat[1].toFixed(4)}, {selected.lngLat[0].toFixed(4)}
        </div>
        <a
          href='https://www.google.com/maps/dir/?api=1&destination={selected.lngLat[1]},{selected.lngLat[0]}'
          target='_blank'
          rel='noopener noreferrer'
          class='text-sm text-primary-foreground px-3 py-1.5 rounded-md bg-primary inline-flex gap-1.5 transition-colors items-center hover:bg-primary/90'
        >
          <span class='i-ph-navigation'></span>
          Directions
        </a>
      </div>
    {:else}
      <div class='text-sm text-muted-foreground'>
        Select a marker to open the details panel.
      </div>
    {/if}
  </DetailsPanel>

</div>
