<script lang='ts'>
  import type { MarkerProps } from 'shadcn-map'
  import { Map, Marker, NavigationControl, ScaleControl } from 'shadcn-map'

  type Marker = MarkerProps & { id: number, name: string }

  // Demo marker locations
  const markers = [
    { id: 1, lngLat: [19.0402, 47.4949], name: 'Parliament', color: 'bg-violet-500 dark:bg-violet-600', icon: 'i-ph:building-bold' },
    { id: 2, lngLat: [19.0514, 47.4925], name: 'Chain Bridge', color: 'bg-sky-500 dark:bg-sky-600', icon: 'i-ph:bridge-bold' },
    { id: 3, lngLat: [19.0344, 47.5025], name: 'Buda Castle', color: 'bg-green-500 dark:bg-green-600', icon: 'i-ph:castle-turret-bold' },
    { id: 4, lngLat: [19.0621, 47.5005], name: 'Heroes Square', color: 'bg-orange-500 dark:bg-orange-600', icon: 'i-ph:park-bold' },
    { id: 5, lngLat: [19.0818, 47.4734], name: 'Airport', color: 'bg-rose-500 dark:bg-rose-600', icon: 'i-ph:airplane-bold' },
    { id: 6, lngLat: [19.0818, 47.4734], name: 'Custom', color: 'bg-blue-800 dark:bg-blue-900', icon: 'i-custom:yuo' },
  ] satisfies Marker[]

  let selected = $state<Marker | null>(null)

  function handleMapClick() {
    selected = null
  }

  function handleMarkerClick(marker: Marker) {
    selected = marker
  }
</script>

<div class='h-full w-full relative'>
  <Map
    tiles='https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles'
    center={[19.0402, 47.4979]}
    zoom={12}
    onclick={handleMapClick}
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

    <NavigationControl position='bottom-right' />
    <ScaleControl position='bottom-left' />
  </Map>

  <!-- Info panel -->
  {#if selected}
    <div class='p-4 border border-border rounded-lg bg-card max-w-xs shadow-lg left-4 top-4 absolute z-10'>
      <h2 class='text-lg text-foreground font-semibold'>{selected.name}</h2>
      <p class='text-sm text-muted-foreground mt-1'>
        Coordinates: {selected.lngLat[1].toFixed(4)}, {selected.lngLat[0].toFixed(4)}
      </p>
      <div class='mt-3 flex gap-2'>
        <a
          href='https://www.google.com/maps/dir/?api=1&destination={selected.lngLat[1]},{selected.lngLat[0]}'
          target='_blank'
          rel='noopener noreferrer'
          class='text-sm text-primary-foreground px-3 py-1.5 rounded-md bg-primary inline-flex gap-1.5 transition-colors items-center hover:bg-primary/90'
        >
          <span class='i-ph-navigation'></span>
          Directions
        </a>
        <button
          onclick={() => selected = null}
          class='text-sm text-muted-foreground px-3 py-1.5 rounded-md bg-muted transition-colors hover:bg-muted/80'
        >
          Close
        </button>
      </div>
    </div>
  {/if}
</div>
