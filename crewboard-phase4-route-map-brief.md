# CrewBoard — Route Map Brief (Phase 4)

> Add an interactive route map to the flight detail page showing origin and destination airports with a great-circle arc connecting them, using Mapbox GL JS with a dark map style.

---

## 1. Overview

This phase adds a single visual component: an interactive map on the flight detail page (`/dashboard/flights/[flightId]`) showing the flight's route. Two airport markers (origin and destination) connected by a curved great-circle line, rendered on Mapbox's dark map style to match the app's dark theme.

### What's New
- Airport coordinates dataset (`config/airports.json`) — static JSON, ~500KB, 28k+ airports keyed by ICAO
- `RouteMap` client component using Mapbox GL JS
- Map rendered on the flight detail page between the flight info card and METAR cards
- `NEXT_PUBLIC_MAPBOX_TOKEN` environment variable

### What Doesn't Change
- Everything else. This is a purely additive visual feature.

---

## 2. Airport Coordinates Dataset

### Source

Use the [mwgg/Airports](https://github.com/mwgg/Airports) dataset — MIT licensed, 28k+ airports, ICAO-keyed JSON.

Download `airports.json` from the repo and place it at `config/airports.json`.

### Structure

```json
{
  "KATL": {
    "icao": "KATL",
    "iata": "ATL",
    "name": "Hartsfield-Jackson Atlanta International Airport",
    "city": "Atlanta",
    "country": "US",
    "elevation": 1026,
    "lat": 33.6367,
    "lon": -84.4281,
    "tz": "America/New_York"
  },
  "EDDF": {
    "icao": "EDDF",
    "iata": "FRA",
    "name": "Frankfurt am Main International Airport",
    "city": "Frankfurt",
    "country": "DE",
    "elevation": 364,
    "lat": 50.0333,
    "lon": 8.5705,
    "tz": "Europe/Berlin"
  }
}
```

### Usage

Create a lookup helper:

```typescript
// lib/airports.ts
import airportsData from '@/config/airports.json'

interface AirportInfo {
  icao: string
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  elevation: number
  tz: string
}

export function getAirport(icao: string): AirportInfo | null {
  const entry = (airportsData as Record<string, AirportInfo>)[icao]
  return entry ?? null
}
```

### File Size Consideration

The full dataset is ~3.5MB uncompressed. Since this is imported in a client component (the map), it will be bundled into the client JS. Options to reduce impact:

**Option A (recommended)**: Create a trimmed version containing only the airports that appear in the Route table. Run a one-time script after seeding that extracts the unique airport ICAO codes from the DB and filters the full dataset down to just those (~200-500 airports, ~50KB). Place at `config/airports-trimmed.json`.

**Option B**: Use the full file but import it dynamically (`import()`) so it's a separate chunk, only loaded on the flight detail page. The map page is the only consumer.

**Option C**: Keep the full file for now — 3.5MB gzipped is ~400KB, acceptable for a non-critical page. Optimise later if needed.

Start with Option B or C for simplicity. Optimise to Option A if bundle size becomes a concern.

---

## 3. Mapbox GL JS Setup

### Account & Token

1. Create a free Mapbox account at [mapbox.com](https://www.mapbox.com/)
2. Get a default public access token from the account dashboard
3. Add to `.env.local` and Vercel environment variables:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1I...
   ```

**Free tier**: 50,000 map loads per month. More than sufficient.

### Package

```bash
npm install mapbox-gl
```

Also install types if not included:
```bash
npm install -D @types/mapbox-gl
```

### CSS

Mapbox GL JS requires its CSS. Import in the component or in `globals.css`:

```css
@import 'mapbox-gl/dist/mapbox-gl.css';
```

Or import in the component file:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css'
```

---

## 4. RouteMap Component

### File
```
components/RouteMap.tsx
```

This is a **client component** (`'use client'`).

### Props

```typescript
interface RouteMapProps {
  origin: {
    icao: string
    name: string
    lat: number
    lon: number
  }
  destination: {
    icao: string
    name: string
    lat: number
    lon: number
  }
}
```

### Behaviour

1. Render a Mapbox GL map in a container div
2. Use the `dark-v11` style: `mapbox://styles/mapbox/dark-v11`
3. Auto-fit the map bounds to show both airports with padding
4. Place markers at origin and destination
5. Draw a curved great-circle arc between them

### Map Styling

**Container**: `w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-dark-border`

**Map style**: `mapbox://styles/mapbox/dark-v11` — dark background, subtle country borders, muted labels. Matches the app's dark theme perfectly.

### Markers

Use Mapbox GL's `Marker` class with custom HTML elements for amber-coloured pins:

```typescript
// Custom marker element
const markerEl = document.createElement('div')
markerEl.style.width = '12px'
markerEl.style.height = '12px'
markerEl.style.borderRadius = '50%'
markerEl.style.backgroundColor = '#FFC107'  // accent-400
markerEl.style.border = '2px solid #FFB300'  // accent-500
markerEl.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.4)'
```

Add a popup or tooltip showing the ICAO code and airport name on hover/click:

```typescript
new mapboxgl.Popup({ offset: 10, closeButton: false })
  .setHTML(`<strong style="color: #F1F2F4;">${icao}</strong><br><span style="color: #9CA3AF; font-size: 12px;">${name}</span>`)
```

Style the popup with dark background to match theme:
```css
.mapboxgl-popup-content {
  background: #1A1D24;
  border: 1px solid #2A2E37;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.mapboxgl-popup-tip {
  border-top-color: #1A1D24;
}
```

### Route Arc

Draw a great-circle arc between origin and destination. Mapbox renders GeoJSON lines as straight segments on the Mercator projection, so for a curved arc you need to generate intermediate points along the great circle.

Use the `@turf/great-circle` package or manually compute intermediate points:

```bash
npm install @turf/great-circle
```

```typescript
import greatCircle from '@turf/great-circle'

const arc = greatCircle(
  [origin.lon, origin.lat],
  [destination.lon, destination.lat],
  { npoints: 100 }
)
```

This returns a GeoJSON LineString with 100 points along the great circle. Add it as a source and layer:

```typescript
map.addSource('route', {
  type: 'geojson',
  data: arc,
})

map.addLayer({
  id: 'route-line',
  type: 'line',
  source: 'route',
  paint: {
    'line-color': '#FFC107',      // accent-400
    'line-width': 2,
    'line-opacity': 0.7,
    'line-dasharray': [2, 2],     // dashed line — feels like a flight plan route
  },
})
```

**Alternative**: Use a solid line instead of dashed if it looks cleaner. Test both.

### Fit Bounds

Auto-zoom the map to show both airports:

```typescript
const bounds = new mapboxgl.LngLatBounds()
bounds.extend([origin.lon, origin.lat])
bounds.extend([destination.lon, destination.lat])

map.fitBounds(bounds, {
  padding: { top: 50, bottom: 50, left: 50, right: 50 },
  maxZoom: 8,
})
```

The `maxZoom: 8` prevents over-zooming for very short routes (e.g. EDDF → EDDM).

### ICAO Labels on Map

Optionally, add the ICAO code as a text label near each marker using a Mapbox symbol layer. This gives the map an aviation chart feel:

```typescript
map.addSource('labels', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [origin.lon, origin.lat] }, properties: { label: origin.icao } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [destination.lon, destination.lat] }, properties: { label: destination.icao } },
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
```

---

## 5. Integration with Flight Detail Page

### Placement

The map sits between the flight info card and the METAR cards:

```
┌─────────────────────────────────┐
│  Flight Info Card + SimBrief    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│                                 │
│         ROUTE MAP               │
│    [origin pin]────[dest pin]   │
│                                 │
└─────────────────────────────────┘

┌──────────────┐ ┌──────────────┐
│  DEP METAR   │ │  ARR METAR   │
└──────────────┘ └──────────────┘
```

### Data Flow

The flight detail page (server component) looks up airport coordinates and passes them to the RouteMap client component:

```typescript
// In app/dashboard/flights/[flightId]/page.tsx
import { getAirport } from '@/lib/airports'

// ... after fetching the flight
const originAirport = getAirport(flight.originIcao)
const destAirport = getAirport(flight.destinationIcao)

// In the JSX
{originAirport && destAirport && (
  <RouteMap
    origin={{
      icao: flight.originIcao,
      name: originAirport.name,
      lat: originAirport.lat,
      lon: originAirport.lon,
    }}
    destination={{
      icao: flight.destinationIcao,
      name: destAirport.name,
      lat: destAirport.lat,
      lon: destAirport.lon,
    }}
  />
)}
```

If either airport isn't found in the coordinates dataset, simply don't render the map. No error, no empty state — just omit it gracefully.

---

## 6. Environment Variables

Add to `.env.example` and `.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1..."
```

Add to Vercel project settings. The `NEXT_PUBLIC_` prefix makes it available in client components.

---

## 7. New Files

```
config/airports.json              # Airport coordinates dataset (from mwgg/Airports)
lib/airports.ts                   # Airport lookup helper
components/RouteMap.tsx            # Mapbox GL route map client component
```

## Modified Files

```
app/dashboard/flights/[flightId]/page.tsx   # Add RouteMap between flight info and METAR
app/globals.css                              # Import mapbox-gl CSS (if not imported in component)
package.json                                 # Add mapbox-gl, @turf/great-circle
```

---

## 8. Implementation — Single Slice

**Goal**: Interactive route map on the flight detail page.

**Tasks:**
1. Download `airports.json` from mwgg/Airports repo, place in `config/`
2. Create `lib/airports.ts` with `getAirport()` lookup function
3. Install `mapbox-gl` and `@turf/great-circle`
4. Create `components/RouteMap.tsx`:
   - Mapbox GL map with `dark-v11` style
   - Two amber markers (origin + destination) with popups
   - Great-circle arc in amber with dashed line
   - ICAO labels on the map
   - Auto-fit bounds with padding
   - Dark-themed popup styling
5. Integrate into flight detail page — pass airport coordinates from server component to RouteMap client component
6. Handle missing airports gracefully (no map if coordinates unavailable)
7. Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.example` and Vercel settings
8. Import Mapbox CSS

**Testable by**: Open any flight detail page — map renders with dark style, two amber pins at correct airports, curved amber route line connecting them. Click a marker to see ICAO + airport name popup. Map auto-zooms to fit both airports. Short routes (e.g. EDDF → EDDM) don't zoom in too much. Long routes (e.g. KJFK → KLAX) show the full arc. Flights with unknown airports (not in dataset) simply don't show a map.

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Airport ICAO not in coordinates dataset | Don't render the map — no error |
| Very short route (same city pair) | `maxZoom: 8` prevents over-zooming |
| Very long route (transatlantic) | Great-circle arc shows the curved path correctly |
| Mapbox token missing or invalid | Map container shows blank/error — consider a fallback "Map unavailable" message |
| Antimeridian crossing (e.g. Pacific routes) | `@turf/great-circle` handles this correctly by default |
| Same origin and destination (shouldn't happen but just in case) | Single marker, no arc line |

---

## 10. Future Enhancements (Not This Phase)

- Full schedule route map showing all legs connected (on the schedule detail page)
- Airport info in marker popups (elevation, timezone, city)
- Distance in nautical miles displayed on the map or flight info card
- Animated flight path (plane icon moving along the arc)
- Mini map preview in the schedule table for each leg
