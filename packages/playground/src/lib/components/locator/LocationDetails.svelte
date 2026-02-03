<script lang='ts'>
  import type { WashLocation } from '$lib/data/washes'
  import { isOpenNow } from '$lib/stores/washes.svelte'
  import { cn } from '$lib/utils'
  import { formatHours, formatHuf } from './format'

  const {
    location,
    onBack,
    showBack = false,
    class: className = '',
  }: {
    location: WashLocation
    onBack?: () => void
    showBack?: boolean
    class?: string
  } = $props()

  const destination = $derived.by(() => {
    const [lng, lat] = location.lngLat
    return `${lat},${lng}`
  })

  const openNow = $derived(isOpenNow(location))
</script>

<div class={cn('grid gap-3', className)}>
  <div class='flex gap-3 items-start justify-between'>
    <div class='min-w-0'>
      {#if showBack}
        <button
          type='button'
          class='text-sm text-muted-foreground mb-2 inline-flex gap-1 transition-colors items-center hover:text-foreground'
          onclick={() => onBack?.()}
        >
          <span class='i-ph:arrow-left-bold' aria-hidden='true'></span>
          Back
        </button>
      {/if}
      <div class='text-lg leading-tight font-semibold'>{location.name}</div>
      <div class='text-sm text-muted-foreground'>{location.address}</div>
      <div class='text-sm text-muted-foreground'>{location.city}</div>
    </div>
    <div class='text-right shrink-0'>
      <div class={cn('text-xs font-medium px-2 py-1 rounded-full', openNow ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
        {openNow ? 'Open now' : 'Closed'}
      </div>
    </div>
  </div>

  <div class='gap-2 grid grid-cols-2'>
    <div class='p-2 border border-border rounded-lg bg-card'>
      <div class='text-xs text-muted-foreground'>Hours</div>
      <div class='text-sm font-medium'>{formatHours(location)}</div>
    </div>
    <div class='p-2 border border-border rounded-lg bg-card'>
      <div class='text-xs text-muted-foreground'>Price</div>
      <div class='text-sm font-medium'>{formatHuf(location.pricePerWashHuf)}</div>
    </div>
    <div class='p-2 border border-border rounded-lg bg-card'>
      <div class='text-xs text-muted-foreground'>Bays</div>
      <div class='text-sm font-medium'>{location.bays}</div>
    </div>
    <div class='p-2 border border-border rounded-lg bg-card'>
      <div class='text-xs text-muted-foreground'>Terminals</div>
      <div class='text-sm font-medium'>{location.terminals}</div>
    </div>
    <div class='p-2 border border-border rounded-lg bg-card col-span-2'>
      <div class='text-xs text-muted-foreground'>Max vehicle height</div>
      <div class='text-sm font-medium'>{location.maxVehicleHeightCm} cm</div>
    </div>
  </div>

  <div class='gap-2 grid'>
    <div class='text-sm font-semibold'>Services</div>
    <div class='text-sm flex flex-wrap gap-2'>
      {#if location.hasVacuum}
        <span class='px-2 py-1 rounded-full bg-muted inline-flex gap-1 items-center'>
          <span class='i-ph:broom-fill' aria-hidden='true'></span>
          Vacuum
        </span>
      {/if}
      {#if location.hasAutomatic}
        <span class='px-2 py-1 rounded-full bg-muted inline-flex gap-1 items-center'>
          <span class='i-ph:robot' aria-hidden='true'></span>
          Automatic
        </span>
      {/if}
      {#if location.hasCardPayment}
        <span class='px-2 py-1 rounded-full bg-muted inline-flex gap-1 items-center'>
          <span class='i-ph:credit-card' aria-hidden='true'></span>
          Card
        </span>
      {/if}
      {#if !location.hasVacuum && !location.hasAutomatic && !location.hasCardPayment}
        <span class='text-sm text-muted-foreground'>No extra services listed.</span>
      {/if}
    </div>
  </div>

  <a
    class='text-primary-foreground px-3 rounded-md bg-primary inline-flex gap-2 h-10 transition-colors items-center justify-center hover:bg-primary/90'
    href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
    target='_blank'
    rel='noopener noreferrer'
  >
    <span class='i-ph:navigation-arrow-bold' aria-hidden='true'></span>
    Open in Maps
  </a>
</div>
