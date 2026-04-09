import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import { POSITRON_ATTRIBUTION, POSITRON_TILE_URL } from '@/infrastructure/leafletBasemap'
import type { PublicPanelRow } from './usePublicPanels'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markerColor(status: string): string {
  if (status === 'maintenance') return '#94a3b8'
  if (status === 'inactive' || status === 'planning') return '#cbd5e1'
  return '#e7bb0e'
}

function popupHtml(p: PublicPanelRow): string {
  const name = escapeHtml(p.name)
  const sub = escapeHtml(`${p.city ?? ''} ${p.state ?? ''}`.trim())
  return `<strong>${name}</strong><br/><span style="color:#64748b;font-size:12px">${sub}</span>`
}

export function useLeafletPublicMap(
  container: Ref<HTMLElement | null>,
  panels: Ref<PublicPanelRow[]>,
) {
  const map = shallowRef<L.Map | null>(null)
  const ready = ref(false)
  const markersLayer = shallowRef<L.LayerGroup | null>(null)
  let resizeObserver: ResizeObserver | null = null
  let onWinResize: (() => void) | null = null

  function invalidate() {
    const m = map.value
    if (!m) return
    m.invalidateSize()
  }

  function init() {
    const el = container.value
    if (!el || map.value) return

    const m = L.map(el, {
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer(POSITRON_TILE_URL, {
      attribution: POSITRON_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(m)

    L.control.zoom({ position: 'topright' }).addTo(m)

    m.setView([-22.5, -47.0], 6)

    const group = L.layerGroup().addTo(m)
    markersLayer.value = group
    map.value = m

    m.whenReady(() => {
      ready.value = true
      invalidate()
      requestAnimationFrame(() => invalidate())
    })

    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(invalidate)
    })
    resizeObserver.observe(el)
    onWinResize = () => requestAnimationFrame(invalidate)
    window.addEventListener('resize', onWinResize, { passive: true })
  }

  function clearMarkers() {
    markersLayer.value?.clearLayers()
  }

  function syncMarkers() {
    const m = map.value
    const group = markersLayer.value
    if (!m || !group || !ready.value) return

    clearMarkers()
    for (const p of panels.value) {
      const dot = document.createElement('div')
      dot.style.cssText = `width:16px;height:16px;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2);background:${markerColor(p.status)}`
      const icon = L.divIcon({
        html: dot,
        className: 'mw-leaflet-div-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(popupHtml(p))
        .addTo(group)
    }

    if (panels.value.length > 0) {
      const b = L.latLngBounds(panels.value.map((p) => [p.latitude, p.longitude]))
      m.fitBounds(b, { padding: [48, 48], maxZoom: 14 })
    }
  }

  watch([map, ready, panels], syncMarkers, { deep: true })

  onUnmounted(() => {
    if (onWinResize) {
      window.removeEventListener('resize', onWinResize)
      onWinResize = null
    }
    resizeObserver?.disconnect()
    resizeObserver = null
    markersLayer.value = null
    map.value?.remove()
    map.value = null
    ready.value = false
  })

  return { map, ready, init, syncMarkers }
}
