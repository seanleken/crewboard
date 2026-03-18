'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Airport {
  icao: string
  name: string
  lat: number
  lon: number
}

interface RouteMapProps {
  origin: Airport
  destination: Airport
}

/** Compute intermediate points along a great-circle arc (no external deps) */
function greatCirclePoints(
  start: [number, number],
  end: [number, number],
  n = 100
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI

  const lat1 = toRad(start[1])
  const lon1 = toRad(start[0])
  const lat2 = toRad(end[1])
  const lon2 = toRad(end[0])

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
      )
    )

  if (d === 0) return [start, end]

  const points: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))
    const lon = toDeg(Math.atan2(y, x))
    points.push([lon, lat])
  }
  return points
}

function makeMarker(icao: string, name: string, color: { bg: string; border: string; glow: string }): mapboxgl.Marker {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${color.bg};
    border: 2px solid ${color.border};
    box-shadow: 0 0 8px ${color.glow};
    cursor: pointer;
  `

  const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
    `<strong style="color:#F1F2F4;font-size:13px;">${icao}</strong><br>
     <span style="color:#9CA3AF;font-size:12px;">${name}</span>`
  )

  return new mapboxgl.Marker({ element: el }).setPopup(popup)
}

export default function RouteMap({ origin, destination }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!containerRef.current || mapRef.current || !token) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }))

    map.on('load', () => {
      // Route arc
      const arcPoints = greatCirclePoints(
        [origin.lon, origin.lat],
        [destination.lon, destination.lat]
      )

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: arcPoints },
          properties: {},
        },
      })

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#FFC107',
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2],
        },
      })

      // ICAO labels
      map.addSource('labels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [origin.lon, origin.lat] },
              properties: { label: origin.icao },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [destination.lon, destination.lat] },
              properties: { label: destination.icao },
            },
          ],
        },
      })

      map.addLayer({
        id: 'airport-labels',
        type: 'symbol',
        source: 'labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#F1F2F4',
          'text-halo-color': '#111318',
          'text-halo-width': 1,
        },
      })

      // Markers — amber for origin (departure), green for destination (arrival)
      const amber = { bg: '#FFC107', border: '#FFB300', glow: 'rgba(255, 193, 7, 0.4)' }
      const green = { bg: '#4ADE80', border: '#22C55E', glow: 'rgba(74, 222, 128, 0.4)' }
      makeMarker(origin.icao, origin.name, amber).setLngLat([origin.lon, origin.lat]).addTo(map)
      makeMarker(destination.icao, destination.name, green).setLngLat([destination.lon, destination.lat]).addTo(map)

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend([origin.lon, origin.lat])
      bounds.extend([destination.lon, destination.lat])
      map.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 50, right: 50 }, maxZoom: 8 })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [origin.icao, origin.lat, origin.lon, origin.name, destination.icao, destination.lat, destination.lon, destination.name])

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null

  return (
    <div
      ref={containerRef}
      className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-dark-border"
    />
  )
}
