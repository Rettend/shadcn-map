import type { JSX } from '@solidjs/web'
import type { ControlPosition } from '../../../shared/types'
import { NavigationControl as MapLibreNavigationControl } from 'maplibre-gl'
import { onSettled } from 'solid-js'
import { getMapContext } from '../../context'

export interface NavigationControlProps {
  /** Control position on map */
  position?: ControlPosition
  /** Show compass */
  showCompass?: boolean
  /** Show zoom buttons */
  showZoom?: boolean
}

export function NavigationControl(props: NavigationControlProps): JSX.Element {
  const ctx = getMapContext()

  onSettled(() => {
    const map = ctx.map
    if (!map) {
      return
    }

    const control = new MapLibreNavigationControl({
      showCompass: props.showCompass ?? true,
      showZoom: props.showZoom ?? true,
      visualizePitch: true,
    })

    map.addControl(control, props.position ?? 'top-right')

    return () => {
      if (map.hasControl(control)) {
        map.removeControl(control)
      }
    }
  })

  return null
}

export default NavigationControl
