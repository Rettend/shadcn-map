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
    onCloseDetails,
    onSearchSubmit,
    onQueryChange,
    onFiltersChange,
    onToggleExpanded,
    class: className = '',
  }: {
    store: WashesStore
    results: WashResult[]
    selected: WashLocation | null
    onSelect: (id: string) => void
    onCloseDetails: () => void
    onSearchSubmit: () => void
    onQueryChange: (q: string) => void
    onFiltersChange: (f: FiltersState) => void
    onToggleExpanded: () => void
    class?: string
  } = $props()

  const heightClass = $derived(
    store.drawerCollapsed ? 'h-[52px]' : (store.drawerExpanded ? 'h-[60vh]' : 'h-[30vh]'),
  )

  function handleToggleCollapsed() {
    if (store.drawerMode === 'details') {
      onCloseDetails()
      return
    }
    store.drawerCollapsed = !store.drawerCollapsed
    if (store.drawerCollapsed) {
      store.drawerExpanded = false
    }
  }
</script>

<section
  class={cn(
    'absolute left-3 right-3 bottom-3 z-20',
    'rounded-xl border border-border bg-card text-card-foreground shadow-xl',
    'flex flex-col overflow-hidden',
    heightClass,
    className,
  )}
>
  <div class='p-2 border-b border-border flex gap-2 items-center justify-between'>
    <button
      type='button'
      class='border border-border rounded-md bg-background inline-flex h-8 w-10 transition-colors items-center justify-center hover:bg-muted'
      onclick={onToggleExpanded}
      aria-label={store.drawerCollapsed ? 'Show panel' : (store.drawerExpanded ? 'Collapse panel' : 'Expand panel')}
      title={store.drawerCollapsed ? 'Show' : (store.drawerExpanded ? 'Collapse' : 'Expand')}
    >
      <span class={cn('i-ph:caret-up-bold text-base', store.drawerExpanded && 'rotate-180')} aria-hidden='true'></span>
    </button>

    <div class='text-sm font-semibold min-w-0 truncate'>
      {#if store.drawerMode === 'details'}
        {selected?.name ?? 'Details'}
      {:else}
        Nearby washes
      {/if}
    </div>

    <button
      type='button'
      class='border border-border rounded-md bg-background inline-flex h-8 w-10 transition-colors items-center justify-center hover:bg-muted'
      onclick={handleToggleCollapsed}
      aria-label={store.drawerMode === 'details' ? 'Close details' : (store.drawerCollapsed ? 'Show panel' : 'Hide panel')}
      title={store.drawerMode === 'details' ? 'Close details' : (store.drawerCollapsed ? 'Show' : 'Hide')}
    >
      <span class='i-ph:x-bold text-base' aria-hidden='true'></span>
    </button>
  </div>

  {#if !store.drawerCollapsed}
    <div class='p-3 border-b border-border'>
      {#if store.drawerMode === 'browse'}
        <SearchRow
          query={store.query}
          filters={store.filters}
          onQueryChange={onQueryChange}
          onFiltersChange={onFiltersChange}
          onSubmit={onSearchSubmit}
        />
      {/if}
    </div>

    <div class='p-3 flex-1 overflow-auto'>
      {#if store.drawerMode === 'details' && selected}
        <LocationDetails location={selected} />
      {:else}
        <ResultsList results={results} selectedId={store.selectedId} onSelect={onSelect} />
      {/if}
    </div>
  {/if}
</section>
