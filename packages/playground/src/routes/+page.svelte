<script lang='ts'>
  import type { MarkerBadge, MarkerProps } from 'shadcn-map'
  import { DetailsPanel, Map, Marker, NavigationControl, Popup, ScaleControl } from 'shadcn-map'

  type Marker = MarkerProps & {
    id: number | string
    name: string
    description: string
    detailMode: 'popup' | 'panel'
    ringColor?: string
  }

  // Demo marker locations
  const markers = [
    {
      id: 1,
      lngLat: [19.0456, 47.5071],
      name: 'Parliament',
      description: 'Gothic Revival landmark on the Danube.',
      color: 'bg-violet-500 dark:bg-violet-600',
      ringColor: 'ring-violet-500/50',
      icon: 'i-ph:building-bold',
      detailMode: 'popup',
      size: 'md',
    },
    {
      id: 11,
      lngLat: [19.0426, 47.5071],
      name: 'Parliament',
      description: 'Gothic Revival landmark on the Danube.',
      color: 'bg-violet-500 dark:bg-violet-600',
      ringColor: 'ring-violet-500/50',
      icon: 'i-ph:building-bold',
      detailMode: 'popup',
      size: 'sm',
    },
    {
      id: 12,
      lngLat: [19.0486, 47.5071],
      name: 'Parliament',
      description: 'Gothic Revival landmark on the Danube.',
      color: 'bg-violet-500 dark:bg-violet-600',
      ringColor: 'ring-violet-500/50',
      icon: 'i-ph:building-bold',
      detailMode: 'popup',
      size: 'lg',
    },
    {
      id: 2,
      lngLat: [19.0437, 47.4989],
      name: 'Chain Bridge',
      description: 'Iconic suspension bridge linking Buda and Pest.',
      color: 'bg-sky-500 dark:bg-sky-600',
      ringColor: 'ring-sky-500/50',
      icon: 'i-ph:bridge-bold',
      detailMode: 'popup',
    },
    {
      id: 3,
      lngLat: [19.0397, 47.4961],
      name: 'Buda Castle',
      description: 'Historic royal palace with sweeping views.',
      color: 'bg-green-500 dark:bg-green-600',
      ringColor: 'ring-green-500/50',
      icon: 'i-ph:castle-turret-bold',
      detailMode: 'panel',
    },
    {
      id: 4,
      lngLat: [19.0778, 47.5150],
      name: 'Heroes Square',
      description: 'Monumental square with statues and museums.',
      color: 'bg-orange-500 dark:bg-orange-600',
      ringColor: 'ring-orange-500/50',
      icon: 'i-ph:park-bold',
      detailMode: 'panel',
    },
    {
      id: 5,
      lngLat: [19.2617, 47.4336],
      name: 'Airport',
      description: 'Budapest Ferenc Liszt International Airport.',
      color: 'bg-rose-500 dark:bg-rose-600',
      ringColor: 'ring-rose-500/50',
      icon: 'i-ph:airplane-bold',
      detailMode: 'panel',
    },
    {
      id: 6,
      lngLat: [19.0818, 47.4734],
      name: 'Custom',
      description: 'Custom UnoCSS marker example.',
      color: 'bg-blue-800 dark:bg-blue-900',
      ringColor: 'ring-blue-800/50',
      icon: 'i-custom:yuo',
      detailMode: 'popup',
    },
  ] satisfies Marker[]

  // Badge test markers - single badges in each position
  const badgeTestMarkers: Array<{
    id: string
    lngLat: [number, number]
    name: string
    description: string
    color: string
    ringColor: string
    icon: string
    detailMode: 'popup'
    size?: 'sm' | 'md' | 'lg'
    badges: MarkerBadge[]
  }> = [
    {
      id: 'badge-tr',
      lngLat: [19.0556, 47.5071] as [number, number],
      name: 'Top-Right Badge',
      description: 'Single badge at top-right (default position)',
      color: 'bg-emerald-500',
      ringColor: 'ring-emerald-500/50',
      icon: 'i-ph:check-circle-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:star-fill', color: 'bg-yellow-500', label: 'Featured' },
      ],
    },
    {
      id: 'badge-tl',
      lngLat: [19.0356, 47.5071] as [number, number],
      name: 'Top-Left Badge',
      description: 'Single badge at top-left position',
      color: 'bg-cyan-500',
      ringColor: 'ring-cyan-500/50',
      icon: 'i-ph:info-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:question-fill', color: 'bg-blue-500', position: 'top-left', label: 'Help available' },
      ],
    },
    {
      id: 'badge-br',
      lngLat: [19.0556, 47.4971] as [number, number],
      name: 'Bottom-Right Badge',
      description: 'Single badge at bottom-right position',
      color: 'bg-pink-500',
      ringColor: 'ring-pink-500/50',
      icon: 'i-ph:heart-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:heart-fill', color: 'bg-rose-500', position: 'bottom-right', label: 'Liked' },
      ],
    },
    {
      id: 'badge-bl',
      lngLat: [19.0356, 47.4971] as [number, number],
      name: 'Bottom-Left Badge',
      description: 'Single badge at bottom-left position',
      color: 'bg-amber-500',
      ringColor: 'ring-amber-500/50',
      icon: 'i-ph:warning-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:warning-fill', color: 'bg-orange-600', position: 'bottom-left', label: 'Warning' },
      ],
    },
    {
      id: 'badge-multi-same',
      lngLat: [19.0456, 47.5171] as [number, number],
      name: 'Multiple Badges (Count: 3)',
      description: 'Three badges at top-right - shows count icon',
      color: 'bg-indigo-500',
      ringColor: 'ring-indigo-500/50',
      icon: 'i-ph:stack-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:credit-card', color: 'bg-purple-500', label: 'Payment' },
        { icon: 'i-ph:lock-key', color: 'bg-green-500', label: 'Secure' },
        { icon: 'i-ph:shield-check', color: 'bg-blue-500', label: 'Verified' },
      ],
    },
    {
      id: 'badge-count-5',
      lngLat: [19.0556, 47.5171] as [number, number],
      name: 'Multiple Badges (Count: 5)',
      description: 'Five badges at top-right - shows number 5',
      color: 'bg-teal-500',
      ringColor: 'ring-teal-500/50',
      icon: 'i-ph:users-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:user', color: 'bg-blue-400', label: 'User 1' },
        { icon: 'i-ph:user', color: 'bg-blue-400', label: 'User 2' },
        { icon: 'i-ph:user', color: 'bg-blue-400', label: 'User 3' },
        { icon: 'i-ph:user', color: 'bg-blue-400', label: 'User 4' },
        { icon: 'i-ph:user', color: 'bg-blue-400', label: 'User 5' },
      ],
    },
    {
      id: 'badge-count-9',
      lngLat: [19.0656, 47.5171] as [number, number],
      name: 'Multiple Badges (Count: 9)',
      description: 'Nine badges at top-right - shows number 9',
      color: 'bg-fuchsia-500',
      ringColor: 'ring-fuchsia-500/50',
      icon: 'i-ph:bell-bold',
      detailMode: 'popup' as const,
      badges: Array.from({ length: 9 }, (_, i) => ({
        icon: 'i-ph:notification',
        color: 'bg-red-400',
        label: `Notification ${i + 1}`,
      })),
    },
    {
      id: 'badge-count-12',
      lngLat: [19.0756, 47.5171] as [number, number],
      name: 'Multiple Badges (Count: 12)',
      description: 'Twelve badges - shows 9+ with "(+3 more)" label',
      color: 'bg-red-500',
      ringColor: 'ring-red-500/50',
      icon: 'i-ph:chat-bold',
      detailMode: 'popup' as const,
      badges: Array.from({ length: 12 }, (_, i) => ({
        icon: 'i-ph:chat-circle',
        color: 'bg-pink-400',
        label: `Message ${i + 1}`,
      })),
    },
    {
      id: 'badge-mixed-positions',
      lngLat: [19.0256, 47.5071] as [number, number],
      name: 'Mixed Positions',
      description: 'Badges at all four positions simultaneously',
      color: 'bg-slate-600',
      ringColor: 'ring-slate-600/50',
      icon: 'i-ph:compass-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:arrow-up-right', color: 'bg-green-500', position: 'top-right' as const, label: 'NE' },
        { icon: 'i-ph:arrow-up-left', color: 'bg-blue-500', position: 'top-left' as const, label: 'NW' },
        { icon: 'i-ph:arrow-down-right', color: 'bg-yellow-500', position: 'bottom-right' as const, label: 'SE' },
        { icon: 'i-ph:arrow-down-left', color: 'bg-purple-500', position: 'bottom-left' as const, label: 'SW' },
      ],
    },
    {
      id: 'badge-multi-positions-count',
      lngLat: [19.0156, 47.4971] as [number, number],
      name: 'Multi-Position with Counts',
      description: 'Multiple badges at different positions with counts',
      color: 'bg-stone-600',
      ringColor: 'ring-stone-600/50',
      icon: 'i-ph:chart-bar-bold',
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:trend-up', color: 'bg-green-500', position: 'top-right' as const, label: 'Up 1' },
        { icon: 'i-ph:trend-up', color: 'bg-green-500', position: 'top-right' as const, label: 'Up 2' },
        { icon: 'i-ph:trend-up', color: 'bg-green-500', position: 'top-right' as const, label: 'Up 3' },
        { icon: 'i-ph:trend-down', color: 'bg-red-500', position: 'top-left' as const, label: 'Down 1' },
        { icon: 'i-ph:trend-down', color: 'bg-red-500', position: 'top-left' as const, label: 'Down 2' },
        { icon: 'i-ph:minus', color: 'bg-gray-500', position: 'bottom-right' as const, label: 'Neutral' },
      ],
    },
    // Size comparison markers - sm, md, lg side by side with badges
    {
      id: 'badge-size-sm',
      lngLat: [19.0256, 47.4901] as [number, number],
      name: 'Small Marker with Badge',
      description: 'Testing badge on small marker',
      color: 'bg-lime-600',
      ringColor: 'ring-lime-600/50',
      icon: 'i-ph:resize-bold',
      size: 'sm' as const,
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:broom-fill', color: 'bg-lime-600', label: 'Small' },
      ],
    },
    {
      id: 'badge-size-md',
      lngLat: [19.0286, 47.4901] as [number, number],
      name: 'Medium Marker with Badge',
      description: 'Testing badge on medium marker',
      color: 'bg-lime-600',
      ringColor: 'ring-lime-600/50',
      icon: 'i-ph:resize-bold',
      size: 'md' as const,
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:broom-fill', color: 'bg-lime-600', label: 'Medium' },
      ],
    },
    {
      id: 'badge-size-lg',
      lngLat: [19.0316, 47.4901] as [number, number],
      name: 'Large Marker with Badge',
      description: 'Testing badge on large marker',
      color: 'bg-lime-600',
      ringColor: 'ring-lime-600/50',
      icon: 'i-ph:resize-bold',
      size: 'lg' as const,
      detailMode: 'popup' as const,
      badges: [
        { icon: 'i-ph:broom-fill', color: 'bg-lime-600', label: 'Large' },
      ],
    },
  ]

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
    autoClusterRadius={50}
    autoClusterMaxZoom={13}
  >
    {#each markers as marker (marker.id)}
      <Marker
        lngLat={marker.lngLat}
        color={marker.color}
        ringColor={marker.ringColor}
        icon={marker.icon}
        label={marker.name}
        size={marker.size}
        active={selected?.id === marker.id}
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

    <!-- Badge test markers -->
    {#each badgeTestMarkers as marker (marker.id)}
      <Marker
        lngLat={marker.lngLat}
        color={marker.color}
        ringColor={marker.ringColor}
        icon={marker.icon}
        label={marker.name}
        size={marker.size}
        badges={marker.badges}
        active={selected?.id === marker.id}
        onclick={() => handleMarkerClick(marker as Marker)}
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
