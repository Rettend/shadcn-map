<script lang='ts'>
  import type { LocationItem } from '$lib/data/markers.svelte'
  import { cn } from '$lib/utils'
  import { formatDistance } from './format'

  const {
    results,
    selectedId,
    onSelect,
    class: className = '',
  }: {
    results: Array<LocationItem & { distanceMeters: number | null, inView: boolean }>
    selectedId: string | null
    onSelect: (id: string) => void
    class?: string
  } = $props()
</script>

<div class={cn('grid gap-2', className)}>
  {#if results.length === 0}
    <div class='text-sm text-muted-foreground p-3 border border-border rounded-md border-dashed'>
      No results.
    </div>
  {:else}
    {#each results as r (r.id)}
      <button
        type='button'
        class={cn(
          'text-left w-full rounded-lg border border-border bg-card p-3',
          'hover:bg-muted transition-colors',
          r.id === selectedId && 'ring-2 ring-ring',
        )}
        onclick={() => onSelect(r.id)}
      >
        <div class='flex gap-3 items-start justify-between'>
          <div class='min-w-0'>
            <div class='text-sm font-semibold truncate'>{r.name}</div>
            <div class='text-xs text-muted-foreground truncate'>{r.address}</div>
            <div class='text-xs text-muted-foreground truncate'>{r.city}</div>
          </div>
          <div class='text-xs text-muted-foreground text-right shrink-0'>
            {#if r.distanceMeters !== null}
              <div class={cn('font-medium', r.inView && 'text-foreground')}>
                {formatDistance(r.distanceMeters)}
              </div>
            {/if}
            {#if r.inView}
              <div class='mt-0.5 inline-flex gap-1 items-center'>
                <span class='i-ph:map-pin-bold' aria-hidden='true'></span>
                in view
              </div>
            {/if}
          </div>
        </div>
      </button>
    {/each}
  {/if}
</div>
