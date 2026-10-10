import type { JSX } from '@solidjs/web'
import { createEffect, createSignal, onSettled, Show } from 'solid-js'

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
  children?: JSX.Element
}

export function DetailsPanel(props: DetailsPanelProps): JSX.Element {
  const [isMobile, setIsMobile] = createSignal(false)

  onSettled(() => {
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  })

  createEffect(
    () => ({
      open: props.open ?? false,
      onclose: props.onclose,
    }),
    state => {
      if (typeof window === 'undefined' || !state.open) {
        return
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          state.onclose?.()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    },
  )

  return (
    <Show when={props.open ?? false}>
      <div
        class={['shadcn-details-panel', props.class]}
        data-device={isMobile() ? 'mobile' : 'desktop'}
        data-height={props.height ?? 'full'}
        role="complementary"
        aria-label={props.ariaLabel ?? 'Details panel'}
      >
        <button
          type="button"
          class="shadcn-details-close"
          aria-label="Close panel"
          onClick={() => props.onclose?.()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div class="shadcn-details-content">{props.children}</div>
      </div>
    </Show>
  )
}
