import type { JSX } from '@solidjs/web'
import type { IControl } from 'maplibre-gl'
import type { ControlPosition } from '../../../shared/types'
import { onSettled } from 'solid-js'
import { getMapContext } from '../../context'

export interface GeolocateControlProps {
  /** Control position on map */
  position?: ControlPosition
  /** Zoom level to fly to when locating */
  zoom?: number
  /** High accuracy geolocation (may be slower / use more battery) */
  enableHighAccuracy?: boolean
  /** Maximum cached position age in ms */
  maximumAge?: number
  /** Timeout in ms */
  timeout?: number
  /** Custom click handler (overrides default geolocation) */
  onclick?: (event: MouseEvent) => void
  /** Called with found coordinates */
  onlocate?: (lngLat: [number, number]) => void
  /** Called when geolocation fails */
  onerror?: (error: GeolocationPositionError | Error) => void
  /** Accessible label */
  ariaLabel?: string
}

export function GeolocateControl(props: GeolocateControlProps): JSX.Element {
  const ctx = getMapContext()

  onSettled(() => {
    const map = ctx.map
    if (!map) {
      return
    }
    let active = true
    let controlContainer: HTMLDivElement | null = null
    let controlButton: HTMLButtonElement | null = null

    function handleClick(event: MouseEvent) {
      if (!active) {
        return
      }
      if (props.onclick) {
        props.onclick(event)
        return
      }

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        props.onerror?.(new Error('Geolocation is not available in this environment.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          if (!active) {
            return
          }
          const lngLat: [number, number] = [position.coords.longitude, position.coords.latitude]
          ctx.flyTo(lngLat, { zoom: props.zoom ?? 14 })
          props.onlocate?.(lngLat)
        },
        error => {
          if (active) {
            props.onerror?.(error)
          }
        },
        {
          enableHighAccuracy: props.enableHighAccuracy ?? true,
          maximumAge: props.maximumAge ?? 30_000,
          timeout: props.timeout ?? 10_000,
        },
      )
    }

    const control: IControl = {
      onAdd() {
        const container = document.createElement('div')
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group shadcn-geolocate'

        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'maplibregl-ctrl-icon shadcn-geolocate-btn'
        button.setAttribute('aria-label', props.ariaLabel ?? 'Go to my location')
        button.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7"></circle>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
            <path d="M12 2v3"></path>
            <path d="M12 19v3"></path>
            <path d="M2 12h3"></path>
            <path d="M19 12h3"></path>
          </svg>
        `

        button.addEventListener('click', handleClick)
        container.appendChild(button)
        controlContainer = container
        controlButton = button
        return container
      },
      onRemove() {
        active = false
        controlButton?.removeEventListener('click', handleClick)
        controlContainer?.remove()
        controlButton = null
        controlContainer = null
      },
    }

    map.addControl(control, props.position ?? 'bottom-right')

    return () => {
      active = false
      if (map.hasControl(control)) {
        map.removeControl(control)
      }
    }
  })

  return null
}

export default GeolocateControl
