<script lang='ts'>
  import type { WashLocation } from '$lib/data/washes'
  import type { FiltersState, WashesStore, WashResult } from '$lib/stores/washes.svelte'
  import { cn } from '$lib/utils'
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
    store: WashesStore
    results: WashResult[]
    selected: WashLocation | null
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
    'absolute left-3 top-3 bottom-3 w-[min(92vw,380px)] z-20',
    'rounded-xl border border-border bg-card text-card-foreground shadow-xl',
    'flex flex-col overflow-hidden',
    className,
  )}
>
  <div class='p-3 border-b border-border'>
    <div class='text-sm font-semibold'>Wash locator</div>
    <div class='text-xs text-muted-foreground'>Search + filters + nearby ordering</div>
  </div>

  <div class='p-3 border-b border-border'>
    <SearchRow
      query={store.query}
      filters={store.filters}
      onQueryChange={onQueryChange}
      onFiltersChange={onFiltersChange}
      onSubmit={onSearchSubmit}
    />
  </div>

  <div class='p-3 flex-1 overflow-auto'>
    {#if selected}
      <LocationDetails location={selected} showBack onBack={onBack} />
    {:else}
      <ResultsList results={results} selectedId={store.selectedId} onSelect={onSelect} />
    {/if}
  </div>
</aside>
