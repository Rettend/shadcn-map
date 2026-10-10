<script lang="ts">
  import type { LocationItem } from '#lib/data/markers.svelte.js'
  import type { FiltersState, LocationResult, LocationsStore } from '#lib/stores/markers.svelte.js'
  import { cn } from '#lib/utils.js'
  import LocationDetails from './LocationDetails.svelte'
  import ResultsList from './ResultsList.svelte'
  import SearchRow from './SearchRow.svelte'

  const {
    store,
    results,
    selected,
    onSelect,
    onBack,
    onSearchSubmit,
    onQueryChange,
    onFiltersChange,
    class: className = '',
  }: {
    store: LocationsStore
    results: LocationResult[]
    selected: LocationItem | null
    onSelect: (id: string) => void
    onBack: () => void
    onSearchSubmit: () => void
    onQueryChange: (q: string) => void
    onFiltersChange: (f: FiltersState) => void
    class?: string
  } = $props()
</script>

<aside
  class={cn(
    // Leave room for the map's bottom-left scale control.
    'w-[min(92vw,380px)] bottom-[36px] left-3 top-3 absolute z-20',
    'text-card-foreground border border-border rounded-xl bg-card shadow-xl',
    'flex flex-col overflow-hidden',
    className,
  )}
>
  <div class="p-3 border-b border-border">
    <SearchRow
      query={store.query}
      filters={store.filters}
      {onQueryChange}
      {onFiltersChange}
      onSubmit={onSearchSubmit}
    />
  </div>

  <div class="p-3 flex-1 overflow-auto">
    {#if selected}
      <LocationDetails location={selected} showBack {onBack} />
    {:else}
      <ResultsList {results} selectedId={store.selectedId} {onSelect} />
    {/if}
  </div>
</aside>
