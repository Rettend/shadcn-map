<script lang='ts'>
  import type { LocationItem } from '$lib/data/markers.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { locations } from '$lib/data/markers.svelte'
  import { Map as MapView, Marker, NavigationControl } from 'shadcn-map'

  interface GeoResult {
    lngLat: [number, number]
    displayName: string
    type: string
  }

  let address = $state('')
  let loading = $state(false)
  let results = $state<GeoResult[]>([])
  let selectedResult = $state<GeoResult | null>(null)
  let adjustedLngLat = $state<[number, number] | null>(null)
  let error = $state<string | null>(null)
  let successMessage = $state<string | null>(null)
  let addedLocations = $state<LocationItem[]>([])

  const finalLngLat = $derived(adjustedLngLat ?? selectedResult?.lngLat ?? null)
  const wasAdjusted = $derived(adjustedLngLat !== null)

  async function lookup() {
    if (!address.trim())
      return
    loading = true
    error = null
    results = []
    selectedResult = null
    adjustedLngLat = null
    successMessage = null

    try {
      // Also add viewbox (bounding box) limited to Hungary
      const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: address,
        format: 'json',
        countrycodes: 'hu',
        limit: '5',
        addressdetails: '1',
        viewbox: '16.1,45.7,22.9,48.6',
        bounded: '1',
      })}`

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'shadcn-map-playground/1.0',
        },
      })

      const data = await res.json()

      if (!data || data.length === 0) {
        error = 'Address not found. Try different wording (e.g. "utca" instead of "út") or include the city name.'
      }
      else {
        results = data.map((item: { lon: string, lat: string, display_name: string, type: string }) => ({
          lngLat: [Number.parseFloat(item.lon), Number.parseFloat(item.lat)] as [number, number],
          displayName: item.display_name,
          type: item.type || 'unknown',
        }))

        // Auto-select first result
        selectedResult = results[0]
      }
    }
    catch (e) {
      error = 'Error searching address'
      console.error(e)
    }
    finally {
      loading = false
    }
  }

  function selectResult(result: GeoResult) {
    selectedResult = result
    adjustedLngLat = null
  }

  function handleMarkerDrag(newLngLat: [number, number]) {
    adjustedLngLat = newLngLat
  }

  function resetPosition() {
    adjustedLngLat = null
  }

  function addToMap() {
    if (!finalLngLat || !selectedResult)
      return

    const newLocation: LocationItem = {
      id: crypto.randomUUID(),
      name: address.split(',')[0] || 'New Location',
      address: selectedResult.displayName.split(',')[0],
      city: selectedResult.displayName.split(',')[1]?.trim() || 'Unknown',
      lngLat: finalLngLat,
      score: 0,
      capacity: 0,
      hasParking: false,
      hasWifi: false,
      isPetFriendly: false,
      openingHours: { mode: 'twentyfour_seven' },
    }

    // Add to our reactive store
    locations.push(newLocation)

    addedLocations = [...addedLocations, newLocation]

    // Show success message
    successMessage = `Added "${newLocation.name}" at [${finalLngLat[0].toFixed(4)}, ${finalLngLat[1].toFixed(4)}]`

    // Reset form
    address = ''
    results = []
    selectedResult = null
    adjustedLngLat = null

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage = null
    }, 5000)
  }
</script>

<div class='mx-auto py-8 container max-w-2xl space-y-8'>
  <div class='flex items-center justify-between'>
    <h1 class='text-2xl font-bold'>Geocode Tool</h1>
    <a href='/' class='text-sm underline transition-colors hover:text-primary'>← Back to Map</a>
  </div>

  <!-- Success Toast -->
  {#if successMessage}
    <div class='text-green-600 p-4 border border-green-500/20 rounded-lg bg-green-500/10 flex gap-3 duration-300 items-center animate-in fade-in slide-in-from-top-2 dark:text-green-400'>
      <span class='i-ph:check-circle-fill text-xl'></span>
      <span class='text-sm font-medium'>{successMessage}</span>
    </div>
  {/if}

  <div class='text-card-foreground p-6 border rounded-xl bg-card shadow-sm space-y-4'>
    <div class='space-y-2'>
      <div class='flex gap-2'>
        <Input
          id='address'
          bind:value={address}
          placeholder='e.g. Váci utca 99, Budapest'
          onkeydown={e => e.key === 'Enter' && lookup()}
        />
        <Button onclick={lookup} disabled={loading}>
          {#if loading}
            <span class='i-ph:spinner mr-2 animate-spin'></span>
            Searching...
          {:else}
            <span class='i-ph:magnifying-glass mr-2'></span>
            Lookup
          {/if}
        </Button>
      </div>
      <p class='text-xs text-muted-foreground'>
      </p>
    </div>

    {#if error}
      <div class='text-red-600 p-3 border border-red-500/20 rounded-lg bg-red-500/10 flex gap-2 items-center dark:text-red-400'>
        <span class='i-ph:warning-circle-fill'></span>
        <span class='text-sm'>{error}</span>
      </div>
    {/if}

    <!-- Results list -->
    {#if results.length > 0}
      <div class='pt-4 border-t space-y-3'>
        <div class='text-sm font-medium'>
          Found {results.length} result{results.length > 1 ? 's' : ''} — select one:
        </div>
        <div class='max-h-48 overflow-y-auto space-y-2'>
          {#each results as result (result.displayName)}
            <button
              type='button'
              class='p-3 text-left border rounded-lg w-full transition-colors {selectedResult === result ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/50'}'
              onclick={() => selectResult(result)}
            >
              <div class='flex gap-2 items-start'>
                <span class='i-ph:map-pin text-primary mt-0.5 shrink-0'></span>
                <div class='flex-1 min-w-0'>
                  <div class='text-sm truncate'>{result.displayName}</div>
                  <div class='text-xs text-muted-foreground font-mono mt-0.5'>
                    [{result.lngLat[0].toFixed(4)}, {result.lngLat[1].toFixed(4)}]
                  </div>
                </div>
                {#if selectedResult === result}
                  <span class='i-ph:check-circle-fill text-primary shrink-0'></span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Map preview with draggable marker -->
    {#if selectedResult && finalLngLat}
      <div class='pt-4 border-t space-y-4'>
        <div class='p-4 rounded-lg bg-muted/50'>
          <div class='flex gap-3 items-start'>
            <span class='i-ph:map-pin-fill text-xl text-primary mt-0.5'></span>
            <div class='flex-1 min-w-0'>
              <div class='font-medium'>
                {wasAdjusted ? 'Adjusted Position' : 'Selected Location'}
                {#if wasAdjusted}
                  <span class='text-xs text-amber-600 ml-2 dark:text-amber-400'>(manually moved)</span>
                {/if}
              </div>
              <div class='text-sm text-muted-foreground truncate'>{selectedResult.displayName}</div>
              <div class='text-xs text-muted-foreground font-mono mt-1'>
                lng: {finalLngLat[0].toFixed(5)}, lat: {finalLngLat[1].toFixed(5)}
              </div>
            </div>
            {#if wasAdjusted}
              <Button variant='ghost' size='sm' onclick={resetPosition}>
                <span class='i-ph:arrow-counter-clockwise mr-1'></span>
                Reset
              </Button>
            {/if}
          </div>
        </div>

        <div class='border rounded-lg h-[300px] w-full relative overflow-hidden'>
          <!-- tiles='https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles' -->
          <MapView
            tiles='/hungary.pmtiles'
            center={finalLngLat}
            labels='roads'
            zoom={16}
            class='h-full w-full'
          >
            <Marker
              lngLat={finalLngLat}
              color='bg-primary'
              draggable
              ondragend={handleMarkerDrag}
              label='Drag to adjust'
            />
            <NavigationControl />
          </MapView>

          <!-- Drag hint overlay -->
          <div class='pointer-events-none bottom-2 left-2 right-2 absolute'>
            <div class='text-xs text-white p-2 text-center rounded-md bg-black/70 backdrop-blur-sm'>
              <span class='i-ph:hand-grabbing mr-1'></span>
              Drag the marker to fine-tune the position
            </div>
          </div>
        </div>

        <Button class='w-full' onclick={addToMap}>
          <span class='i-ph:plus-circle mr-2'></span>
          Add Marker to Map
        </Button>
      </div>
    {/if}
  </div>

  <!-- Added Locations List -->
  {#if addedLocations.length > 0}
    <div class='text-card-foreground p-6 border rounded-xl bg-card shadow-sm space-y-4'>
      <h2 class='font-semibold flex gap-2 items-center'>
        <span class='i-ph:list-bullets'></span>
        Added Locations ({addedLocations.length})
      </h2>
      <div class='space-y-2'>
        {#each addedLocations as loc (loc.id)}
          <div class='text-sm p-3 rounded-lg bg-muted/50 flex gap-3 items-center'>
            <span class='i-ph:map-pin text-primary'></span>
            <div class='flex-1 min-w-0'>
              <div class='font-medium truncate'>{loc.name}</div>
              <div class='text-xs text-muted-foreground font-mono'>
                [{loc.lngLat[0].toFixed(4)}, {loc.lngLat[1].toFixed(4)}]
              </div>
            </div>
          </div>
        {/each}
      </div>
      <p class='text-xs text-muted-foreground'>
        These locations are now visible on the <a href='/' class='underline hover:text-primary'>map page</a>.
        They will reset when you refresh.
      </p>
    </div>
  {/if}

  <!-- Debug section (collapsible) -->
  <details class='text-card-foreground p-4 border rounded-xl bg-card'>
    <summary class='text-sm text-muted-foreground font-medium cursor-pointer transition-colors hover:text-foreground'>
      Debug: Total locations count ({locations.length})
    </summary>
    <div class='text-xs text-muted-foreground mt-4'>
      <p>Total locations in store: <span class='text-foreground font-medium font-mono'>{locations.length}</span></p>
    </div>
  </details>
</div>
