import type { JSX } from '@solidjs/web'
import { isServer, Portal } from '@solidjs/web'
import { Popup as MapLibrePopup } from 'maplibre-gl'
import { createEffect, createMemo, onSettled } from 'solid-js'
import { getMapContext } from '../context'

export interface PopupProps {
  /** Popup position [lng, lat] */
  lngLat: [number, number]
  /** Whether popup is visible */
  open?: boolean
  /** Close callback */
  onclose?: () => void
  /** Close the popup when the map is clicked */
  closeOnClick?: boolean
  /** Additional CSS classes */
  class?: string
  /** Offset from anchor point (number = uniform, array = [x, y], or 'auto' for auto-detected) */
  offset?: number | [number, number] | 'auto'
  /** Children */
  children?: JSX.Element
}

const sizeOffsets: Record<'sm' | 'md' | 'lg', [number, number]> = {
  sm: [0, -12],
  md: [0, -16],
  lg: [0, -20],
}

export function Popup(props: PopupProps): JSX.Element {
  const ctx = getMapContext()
  let popup: MapLibrePopup | null = null
  // MapLibre owns the host; Solid only reconciles the portal's children.
  const contentElement = isServer ? undefined : document.createElement('div')
  let programmaticClose = false
  let syncScheduled = false
  let appliedLocation: [number, number] | undefined
  let appliedOffset: number | [number, number] | undefined
  let ownedActiveMarkerId: string | null = null
  const popupOwner = Symbol('shadcn-map-popup')

  function getMarkerAtLocation(lngLat: [number, number]) {
    for (const marker of ctx.markers.values()) {
      const lngDiff = Math.abs(marker.lngLat[0] - lngLat[0])
      const latDiff = Math.abs(marker.lngLat[1] - lngLat[1])
      if (lngDiff < 0.000001 && latDiff < 0.000001) {
        return marker
      }
    }
    return null
  }
  function getOffset(size: keyof typeof sizeOffsets = 'md'): number | [number, number] {
    const offset = props.offset ?? 'auto'
    if (offset !== 'auto') {
      return typeof offset === 'number' ? offset : [offset[0], offset[1]]
    }
    return sizeOffsets[size]
  }
  const location = createMemo(() => [props.lngLat[0], props.lngLat[1]] as [number, number])

  const syncActiveMarker = (markerId: string | null) => {
    if (ownedActiveMarkerId === markerId) {
      return
    }
    ownedActiveMarkerId = markerId
    if (markerId) {
      ctx.setPopupMarker(popupOwner, markerId)
    } else {
      ctx.clearPopupMarker(popupOwner)
    }
  }

  const handleClose = () => {
    if (!programmaticClose) {
      syncActiveMarker(null)
      props.onclose?.()
    }
  }

  const closePopup = () => {
    if (!popup) {
      return
    }
    programmaticClose = true
    try {
      popup.remove()
    } finally {
      programmaticClose = false
    }
  }

  function scheduleSync() {
    if (syncScheduled) {
      return
    }
    syncScheduled = true
    // Match after sibling markers have registered during mounting.
    onSettled(() => {
      syncScheduled = false
      const map = ctx.map
      if (!popup || !map) {
        return
      }
      const lngLat = location()
      const marker = getMarkerAtLocation(lngLat)
      if (
        !appliedLocation ||
        appliedLocation[0] !== lngLat[0] ||
        appliedLocation[1] !== lngLat[1]
      ) {
        popup.setLngLat(lngLat)
        appliedLocation = lngLat
      }
      const offset = getOffset(marker?.size)
      const offsetChanged =
        typeof offset === 'number'
          ? appliedOffset !== offset
          : !Array.isArray(appliedOffset) ||
            appliedOffset[0] !== offset[0] ||
            appliedOffset[1] !== offset[1]
      if (offsetChanged) {
        popup.setOffset(offset)
        appliedOffset = offset
      }

      if (props.open ?? true) {
        if (!popup.isOpen()) {
          popup.addTo(map)
        }
        syncActiveMarker(marker?.id ?? null)
      } else {
        if (popup.isOpen()) {
          closePopup()
        }
        syncActiveMarker(null)
      }
    })
  }

  onSettled(() => {
    const map = ctx.map
    if (!map || !contentElement) {
      return
    }

    // Effects update this mount-owned instance; cleanup disposes that same instance.
    const initialPopup = new MapLibrePopup({
      closeButton: true,
      closeOnClick: props.closeOnClick ?? true,
      offset: getOffset(getMarkerAtLocation(location())?.size),
      anchor: 'bottom',
      className: 'shadcn-map-popup',
    })
    popup = initialPopup
    initialPopup.setDOMContent(contentElement)
    initialPopup.setLngLat(location())
    initialPopup.on('close', handleClose)

    scheduleSync()

    return () => {
      syncActiveMarker(null)
      initialPopup.off('close', handleClose)
      initialPopup.remove()
      popup = null
      appliedLocation = undefined
      appliedOffset = undefined
    }
  })

  createEffect(() => {
    const offset = props.offset ?? 'auto'
    return {
      map: ctx.map,
      markers: ctx.markers,
      open: props.open ?? true,
      lngLat: location(),
      offset: Array.isArray(offset) ? [offset[0], offset[1]] : offset,
    }
  }, scheduleSync)

  return (
    <Portal mount={contentElement}>
      <div class={['shadcn-popup-content', props.class]}>{props.children}</div>
    </Portal>
  )
}
