<script lang='ts'>
  import type { FiltersState } from '$lib/stores/w$lib/stores/markers.sveltecn } from '$lib/utils'
  import FilterDropdown from './FilterDropdown.svelte'

  const {
    query,
    filters,
    onQueryChange,
    onFiltersChange,
    onSubmit,
    class: className = '',
  }: {
    query: string
    filters: FiltersState
    onQueryChange: (q: string) => void
    onFiltersChange: (f: FiltersState) => void
    onSubmit: () => void
    class?: string
  } = $props()
</script>

<form
  class={cn('flex items-center gap-2', className)}
  onsubmit={(e) => {
    e.preventDefault()
    onSubmit()
  }}
>
  <div class='flex-1 relative'>
    <span class='i-ph:magnifying-glass-bold text-muted-foreground left-3 top-1/2 absolute -translate-y-1/2' aria-hidden='true'></span>
    <input
      class='text-sm pl-9 pr-3 outline-none border border-border rounded-md bg-background h-10 w-full focus:ring-2 focus:ring-ring'
      placeholder='Search city, address…'
      value={query}
      oninput={e => onQueryChange((e.currentTarget as HTMLInputElement).value)}
    />
  </div>
  <FilterDropdown filters={filters} onChange={onFiltersChange} />
</form>
