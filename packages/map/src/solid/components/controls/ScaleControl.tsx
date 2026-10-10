import type { JSX } from '@solidjs/web'
import type { ControlPosition } from '../../../shared/types'
import { ScaleControl as MapLibreScaleControl } from 'maplibre-gl'
import { onSettled } from 'solid-js'
import { getMapContext } from '../../context'

export interface ScaleControlProps {
  /** Control position on map */
  position?: ControlPosition
  /** Unit of measurement */
  unit?: 'imperial' | 'metric' | 'nautical'
  /** Maximum width in pixels */
  maxWidth?: number
}

export function ScaleControl(props: ScaleControlProps): JSX.Element {
  const ctx = getMapContext()

  onSettled(() => {
    const map = ctx.map
    if (!map) {
      return
    }

    const control = new MapLibreScaleControl({
      maxWidth: props.maxWidth ?? 100,
      unit: props.unit ?? 'metric',
    })

    map.addControl(control, props.position ?? 'bottom-left')

    return () => {
      if (map.hasControl(control)) {
        map.removeControl(control)
      }
    }
  })

  return null
}

export default ScaleControl
