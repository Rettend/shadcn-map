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
    /** Children */
    children?: Snippet
  }
</script>

<script lang='ts'>
  import { onMount } from 'svelte'
  import * as Drawer from './ui/drawer'

  const {
    open = false,
    onclose,
    class: className = '',
    ariaLabel = 'Details panel',
    children,
  }: DetailsPanelProps = $props()

  let isMobile = $state(false)

  function handleDrawerOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onclose?.()
    }
  }

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

  $effect(() => {
    if (typeof window === 'undefined' || !open || isMobile) {
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

{#if isMobile}
  <Drawer.Root {open} onOpenChange={handleDrawerOpenChange}>
    <Drawer.Content class='shadcn-details-drawer {className}' aria-label={ariaLabel}>
      <div class='shadcn-details-content'>
        {#if children}
          {@render children()}
        {/if}
      </div>
    </Drawer.Content>
  </Drawer.Root>
{:else if open}
  <button
    type='button'
    class='shadcn-details-overlay shadcn-details-overlay--desktop'
    aria-label='Close details panel'
    onclick={() => onclose?.()}
  ></button>
  <div
    class='shadcn-details-panel {className}'
    role='dialog'
    aria-modal='true'
    aria-label={ariaLabel}
  >
    <div class='shadcn-details-content'>
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .shadcn-details-overlay {
    background: rgba(0, 0, 0, 0.35);
    z-index: 20;
  }

  .shadcn-details-overlay--desktop {
    position: absolute;
    inset: 0;
  }

  .shadcn-details-overlay--mobile {
    position: fixed;
    inset: 0;
  }

  .shadcn-details-panel {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(90vw, 360px);
    background: oklch(var(--card));
    color: oklch(var(--card-foreground));
    border-right: 1px solid oklch(var(--border));
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.25);
    z-index: 30;
    display: flex;
    flex-direction: column;
  }

  .shadcn-details-drawer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 85vh;
    background: oklch(var(--card));
    color: oklch(var(--card-foreground));
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    border: 1px solid oklch(var(--border));
    box-shadow: 0 -12px 24px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
  }

  .shadcn-details-content {
    padding: 20px;
    overflow: auto;
    height: 100%;
  }
</style>
