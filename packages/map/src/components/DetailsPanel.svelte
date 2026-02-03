<script lang='ts' module>
  import type { Snippet } from 'svelte'

  export interface DetailsPanelProps {
    /** Whether panel is visible */
    open?: boolean
    /** Close callback */
    onclose?: () => void
    /** Additional CSS classes */
    class?: string
    /** Accessible label */
    ariaLabel?: string
    /** Height mode - 'fit' for content height, 'full' for nearly full height */
    height?: 'fit' | 'full'
    /** Children */
    children?: Snippet
  }
</script>

<script lang='ts'>
  import { onMount } from 'svelte'

  const {
    open = false,
    onclose,
    class: className = '',
    ariaLabel = 'Details panel',
    height = 'full',
    children,
  }: DetailsPanelProps = $props()

  let isMobile = $state(false)

  onMount(() => {
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia('(max-width: 640px)')
    const update = () => {
      isMobile = media.matches
    }

    update()
    media.addEventListener('change', update)

    return () => {
      media.removeEventListener('change', update)
    }
  })

  // Keyboard escape to close
  $effect(() => {
    if (typeof window === 'undefined' || !open) {
      return
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onclose?.()
      }
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  })
</script>

{#if open}
  <div
    class='shadcn-details-panel {className}'
    data-device={isMobile ? 'mobile' : 'desktop'}
    data-height={height}
    role='complementary'
    aria-label={ariaLabel}
  >
    <button
      type='button'
      class='shadcn-details-close'
      aria-label='Close panel'
      onclick={() => onclose?.()}
    >
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
        <path d='M18 6 6 18' /><path d='m6 6 12 12' />
      </svg>
    </button>

    <div class='shadcn-details-content'>
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .shadcn-details-panel {
    position: absolute;
    background: oklch(var(--card));
    color: oklch(var(--card-foreground));
    border: 1px solid oklch(var(--border));
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    z-index: 10;
    pointer-events: auto;
  }

  /* Desktop: Left side floating panel */
  .shadcn-details-panel[data-device='desktop'] {
    top: 12px;
    left: 12px;
    width: min(90vw, 360px);
  }

  .shadcn-details-panel[data-device='desktop'][data-height='full'] {
    bottom: 52px;
    max-height: calc(100% - 64px);
  }

  .shadcn-details-panel[data-device='desktop'][data-height='fit'] {
    bottom: auto;
    max-height: calc(100% - 64px);
  }

  /* Mobile: Bottom floating card */
  .shadcn-details-panel[data-device='mobile'] {
    left: 12px;
    right: 12px;
    bottom: 52px;
  }

  .shadcn-details-panel[data-device='mobile'][data-height='full'] {
    max-height: 45vh;
  }

  .shadcn-details-panel[data-device='mobile'][data-height='fit'] {
    max-height: 60vh;
    height: auto;
  }

  .shadcn-details-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: oklch(var(--muted));
    color: oklch(var(--muted-foreground));
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    z-index: 1;
  }

  .shadcn-details-close:hover {
    background: oklch(var(--accent));
    color: oklch(var(--accent-foreground));
  }

  .shadcn-details-close:focus-visible {
    outline: 2px solid oklch(var(--ring));
    outline-offset: 2px;
  }

  .shadcn-details-content {
    padding: 20px;
    padding-top: 16px;
    overflow: auto;
    height: 100%;
  }
</style>
