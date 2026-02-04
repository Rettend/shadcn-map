<script lang='ts'>
  import type { FiltersState } from '$lib/stores/markers.svelte'
  import { cn } from '$lib/utils'

  const {
    filters,
    onChange,
    class: className = '',
  }: {
    filters: FiltersState
    onChange: (next: FiltersState) => void
    class?: string
  } = $props()

  let detailsEl: HTMLDetailsElement | null = $state(null)
  let open = $state(false)

  const activeCount = $derived.by(() => {
    let n = 0
    if (filters.openNow)
      n++
    if (filters.hasParking)
      n++
    if (filters.hasWifi)
      n++
    if (filters.isPetFriendly)
      n++
    if (filters.minScore !== null)
      n++
    if (filters.minCapacity !== null)
      n++
    return n
  })

  function set(partial: Partial<FiltersState>) {
    onChange({ ...filters, ...partial })
  }

  function close() {
    open = false
    // Ensure the native "open" attribute is removed even if binding lags.
    detailsEl?.removeAttribute('open')
  }

  $effect(() => {
    if (!open)
      return

    const onPointerDown = (e: PointerEvent) => {
      if (!detailsEl)
        return
      if (e.target instanceof Node && detailsEl.contains(e.target))
        return
      close()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape')
        return
      e.preventDefault()
      close()
      // Put focus back on the trigger for good keyboard UX.
      void (detailsEl?.querySelector('summary') as HTMLElement | null)?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    document.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
      document.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  })
</script>

<details bind:this={detailsEl} bind:open={open} class={cn('relative', className)}>
  <summary
    class={cn(
      'list-none select-none cursor-pointer',
      'h-10 px-3 inline-flex items-center gap-2 rounded-md border border-border bg-background',
      'text-sm text-foreground hover:bg-muted transition-colors',
    )}
  >
    <span class='i-ph:faders-horizontal-bold text-base' aria-hidden='true'></span>
    <span>Filters</span>
    {#if activeCount > 0}
      <span class='text-[11px] text-primary-foreground ml-1 px-1.5 rounded-full bg-primary inline-flex h-5 min-w-5 items-center justify-center'>
        {activeCount}
      </span>
    {/if}
  </summary>

  <div
    class={cn(
      'absolute right-0 mt-2 w-[min(92vw,340px)] z-50',
      'rounded-lg border border-border bg-card text-card-foreground shadow-xl',
      'p-3 grid gap-3',
    )}
  >
    <div class='gap-2 grid'>
      <div class='text-sm font-semibold'>Opening hours</div>
      <label class='text-sm flex gap-2 items-center'>
        <input
          type='checkbox'
          checked={filters.openNow}
          onchange={e => set({ openNow: (e.currentTarget as HTMLInputElement).checked })}
        />
        Open now
      </label>
    </div>

    <div class='bg-border h-px'></div>

    <div class='gap-2 grid'>
      <div class='text-sm font-semibold'>Features</div>
      <label class='text-sm flex gap-2 items-center'>
        <input
          type='checkbox'
          checked={filters.hasParking}
          onchange={e => set({ hasParking: (e.currentTarget as HTMLInputElement).checked })}
        />
        Parking
      </label>
      <label class='text-sm flex gap-2 items-center'>
        <input
          type='checkbox'
          checked={filters.hasWifi}
          onchange={e => set({ hasWifi: (e.currentTarget as HTMLInputElement).checked })}
        />
        Wi-Fi
      </label>
      <label class='text-sm flex gap-2 items-center'>
        <input
          type='checkbox'
          checked={filters.isPetFriendly}
          onchange={e => set({ isPetFriendly: (e.currentTarget as HTMLInputElement).checked })}
        />
        Pet Friendly
      </label>
    </div>

    <div class='bg-border h-px'></div>

    <div class='gap-2 grid'>
      <div class='text-sm font-semibold'>Criteria</div>

      <label class='text-sm gap-1 grid'>
        <span class='text-muted-foreground'>Min Score</span>
        <input
          class='px-2 border border-border rounded-md bg-background h-9'
          inputmode='numeric'
          placeholder='e.g. 8'
          value={filters.minScore ?? ''}
          oninput={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value.trim()
            set({ minScore: v === '' ? null : Math.max(0, Number(v)) })
          }}
        />
      </label>

      <label class='text-sm gap-1 grid'>
        <span class='text-muted-foreground'>Min Capacity</span>
        <input
          class='px-2 border border-border rounded-md bg-background h-9'
          inputmode='numeric'
          placeholder='e.g. 50'
          value={filters.minCapacity ?? ''}
          oninput={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value.trim()
            set({ minCapacity: v === '' ? null : Math.max(0, Number(v)) })
          }}
        />
      </label>
    </div>

    <div class='pt-1 flex items-center justify-between'>
      <button
        type='button'
        class='text-sm text-muted-foreground transition-colors hover:text-foreground'
        onclick={() =>
          onChange({
            openNow: false,
            hasParking: false,
            hasWifi: false,
            isPetFriendly: false,
            minScore: null,
            minCapacity: null,
          })}
      >
        Reset
      </button>
      <div class='text-xs text-muted-foreground'>
        Tip: press <kbd class='px-1 border border-border rounded bg-muted'>Esc</kbd> to close
      </div>
    </div>
  </div>
</details>

<style>
  summary::-webkit-details-marker {
    display: none;
  }
  details[open] > summary {
    background: oklch(var(--muted));
  }
</style>
