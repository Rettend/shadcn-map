# shadcn-map for Svelte 5

## Vision

A **minimal, fast, dark map library** that feels native to shadcn-svelte. Built on MapLibre GL for buttery-smooth vector tile rendering, with a carefully crafted dark theme that matches shadcn's aesthetic perfectly.

**Core Principles:**

- 🎨 **Minimal** — Dark gray background, subtle roads, maybe water. That's it.
- ⚡ **Fast** — 60fps zooming with vector tiles, no chunky raster loading.
- 🧩 **Composable** — Svelte 5 patterns: `$props`, `$state`, `$derived`, snippets (`$effect` is bad practice 99% of the time).
- 🎯 **Opinionated** — One beautiful style, sensible defaults, escape hatches when needed.

---

## Package Structure

```txt
packages/
├── map/                          # The library (published as shadcn-map)
│   ├── src/
│   │   ├── index.ts              # Main exports
│   │   ├── components/
│   │   │   ├── Map.svelte        # Core map component
│   │   │   ├── Marker.svelte     # Custom styled markers
│   │   │   ├── Popup.svelte      # In-place popup
│   │   │   ├── DetailsPanel.svelte # Full-height side panel
│   │   │   ├── ClusterLayer.svelte # Auto-clustering markers
│   │   │   ├── controls/
│   │   │   │   ├── NavigationControl.svelte
│   │   │   │   └── ScaleControl.svelte
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   ├── dark.ts           # Minimal dark style
│   │   │   ├── light.ts          # Minimal light style
│   │   │   └── colors.ts         # Shadcn-aligned color tokens
│   │   ├── context.ts            # Svelte context for map instance
│   │   └── types.ts              # Shared types
│   ├── package.json
│   └── tsconfig.json
│
└── playground/                   # Demo app (SvelteKit + UnoCSS + shadcn-svelte)
    ├── src/
    │   ├── lib/
    │   │   └── components/
    │   │       ├── Sidebar.svelte      # User-defined sidebar
    │   │       ├── FilterPanel.svelte  # User-defined filters
    │   │       └── LocationCard.svelte # User-defined card content
    │   └── routes/
    │       └── +page.svelte            # Demo page
    └── ...
```

---

## Core Components

### 1. `<Map>` — The Container

The foundation. Renders MapLibre GL and provides context to children.

```svelte
<Map
  center={[-74.006, 40.7128]}
  zoom={12}
  style="minimal"
  class="h-full w-full"
  onload={(map) => console.log('Ready!')}
  onclick={(e) => console.log('Clicked:', e.lngLat)}
>
  <!-- Child components get map context automatically -->
  <Marker lngLat={[-74.006, 40.7128]} />
  <NavigationControl />
</Map>
```

**Props:**

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `center` | `[number, number]` | `[0, 0]` | Initial center [lng, lat] |
| `zoom` | `number` | `10` | Initial zoom level |
| `minZoom` | `number` | `0` | Minimum zoom allowed |
| `maxZoom` | `number` | `20` | Maximum zoom allowed |
| `pitch` | `number` | `0` | Camera pitch (3D tilt) |
| `bearing` | `number` | `0` | Camera rotation |
| `style` | `'auto' \| 'dark' \| 'light' \| StyleSpec` | `'auto'` | Map style (`auto` uses mode-watcher) |
| `tiles` | `string` | Required | URL to PMTiles file |
| `interactive` | `boolean` | `true` | Enable pan/zoom |
| `class` | `string` | `''` | Additional classes |

**Events:**

- `onload` — Map fully loaded
- `onclick` — Click on map
- `onmove` — Camera moved
- `onzoom` — Zoom changed

---

### 2. `<Marker>` — Custom Pins

Styled markers with variants, icons, and animations.

```svelte
<Marker
  lngLat={[-74.006, 40.7128]}
  variant="primary"
  size="md"
  pulse
  label="HQ"
  onclick={() => selected = marker}
>
  {#snippet icon()}
    <span class="i-ph-building" />
  {/snippet}
</Marker>
```

**Variants:**

- `default` — Zinc/neutral
- `primary` — Blue accent
- `destructive` — Red
- `success` — Green
- `warning` — Yellow/amber

**Sizes:** `sm`, `md`, `lg`

**Features:**

- Iconify icons via snippet
- Pulse animation for selected/active
- Label on hover
- Draggable mode

---

### 3. `<Popup>` — In-Place Info

Small popup that appears near the marker.

```svelte
<Popup lngLat={selected.lngLat} open={!!selected} onclose={() => selected = null}>
  <h3 class="font-semibold">{selected.name}</h3>
  <p class="text-muted-foreground text-sm">{selected.description}</p>
</Popup>
```

---

### 4. `<DetailsPanel>` — Full-Height Sidebar

For richer content. Slides in from the right (or bottom on mobile).

```svelte
<DetailsPanel open={!!selected} onclose={() => selected = null}>
  <div class="p-6">
    <h2 class="text-2xl font-bold">{selected.name}</h2>
    <!-- Rich content, images, actions, etc. -->
  </div>
</DetailsPanel>
```

**Behavior:**

- Desktop: Full-height panel on right side, **floating over the map**
- Mobile: Drawer from bottom (via bits-ui Drawer)
- **The map is always full-width/height** — all UI floats on top, nothing squeezes the map

---

### 5. `<ClusterLayer>` — Auto-Grouping Markers

For large datasets. Markers cluster automatically based on zoom.

```svelte
<ClusterLayer
  points={locations.map(l => ({
    id: l.id,
    lngLat: l.lngLat,
    properties: { type: l.type }
  }))}
  onclick={(point) => selected = locations.find(l => l.id === point.id)}
/>
```

**Features:**

- Automatic clustering by zoom
- Cluster label shows count
- Click cluster to zoom in
- Click point to select

---

### 6. Controls

#### `<NavigationControl>`

```svelte
<NavigationControl position="bottom-right" showCompass />
```

#### `<ScaleControl>`

```svelte
<ScaleControl position="bottom-left" unit="metric" />
```

---

## Library vs Userland

Clear boundary of what the library provides vs what users build:

### ✅ In Library (shadcn-map)

| Component | Description |
| --------- | ----------- |
| `<Map>` | Core map rendering with MapLibre GL |
| `<Marker>` | Styled pins with variants, icons, animations |
| `<Popup>` | In-place popup near marker |
| `<DetailsPanel>` | Full-height panel (uses shadcn Drawer on mobile) |
| `<ClusterLayer>` | Auto-grouping markers by zoom |
| `<NavigationControl>` | Zoom +/- and compass |
| `<ScaleControl>` | Distance scale bar |
| Styles | Dark/light minimal map styles |
| Context | Map instance access for custom components |

### 🏠 In Userland (playground/your app)

| Component | Description |
| --------- | ----------- |
| Sidebar | Layout, filters, search through YOUR data |
| Filter UI | Checkboxes, dropdowns for your categories |
| Search | Client-side search through your markers |
| Location cards | Custom card content for your data |
| Data fetching | Your API, your data shape |
| "Open in Google Maps" | Simple link with coordinates |

### Peer Dependencies (user must have)

- `bits-ui` — For Drawer in DetailsPanel
- `lucide-svelte` or iconify — For icons
- `mode-watcher` — For dark/light mode detection

---

## Map Styles

### Mode-Watcher Integration

The map automatically follows system/user theme preference:

```svelte
<script>
  import { Map } from 'shadcn-map';
  // mode-watcher is already set up in your app
</script>

<Map style="auto" tiles="https://tiles.example.com/world.pmtiles">
  <!-- Automatically switches between dark/light styles -->
</Map>
```

### Dark Style

Our signature look. Extremely minimal:

| Element | Color | Notes |
| ------- | ----- | ----- |
| Background | `#09090b` (zinc-950) | The void |
| Land | `#0c0c0e` | Barely visible |
| Roads (minor) | `#18181b` (zinc-900) | Subtle |
| Roads (major) | `#27272a` (zinc-800) | Slightly visible |
| Roads (highway) | `#3f3f46` (zinc-700) | Most prominent |
| Water | `#0c1929` | Dark blue, subtle |
| Buildings | `#18181b` | Only at high zoom |
| Labels | `#71717a` (zinc-500) | Minimal, only major places |

### Light Style

Same minimal aesthetic, inverted:

| Element | Color | Notes |
| ------- | ----- | ----- |
| Background | `#fafafa` (zinc-50) | Clean white |
| Land | `#f4f4f5` (zinc-100) | Barely visible |
| Roads (minor) | `#e4e4e7` (zinc-200) | Subtle |
| Roads (major) | `#d4d4d8` (zinc-300) | Slightly visible |
| Roads (highway) | `#a1a1aa` (zinc-400) | Most prominent |
| Water | `#dbeafe` | Light blue, subtle |
| Buildings | `#e4e4e7` | Only at high zoom |
| Labels | `#71717a` (zinc-500) | Minimal, only major places |

**No parks, no POIs, no clutter.** Same principle, both modes.

---

## Tile Source Strategy

**Protomaps + PMTiles only.** No CARTO, no MapTiler complexity.

### Why Protomaps?

- ✅ Free forever (self-hosted)
- ✅ Single static file (PMTiles)
- ✅ Host anywhere (Cloudflare R2, Vercel, S3)
- ✅ Full vector tile control
- ✅ No API keys, no rate limits

### Setup

1. **Download PMTiles for your region:**

   ```bash
   # Full world (~70GB) or extract a region
   npx protomaps extract world.pmtiles hungary.pmtiles --region hungary
   # Single country: ~100-500MB
   ```

2. **Host on Cloudflare R2 (free):**
   - Upload `.pmtiles` file
   - Enable public access
   - Get URL like `https://tiles.yourdomain.com/hungary.pmtiles`

3. **Use in your app:**

   ```svelte
   <Map tiles="https://tiles.yourdomain.com/hungary.pmtiles" />
   ```

### For Development

Use a small local PMTiles file or a free hosted one from protomaps.com demos.

---

## Implementation Phases

### Phase 1: Foundation ✦ MVP

**Goal:** Basic map with markers working

- [ ] Set up library package structure with proper exports
- [ ] Install MapLibre GL + pmtiles
- [ ] Implement `<Map>` component with PMTiles support
- [ ] Create dark + light minimal styles
- [ ] Integrate with mode-watcher for auto theme
- [ ] Implement context for child components
- [ ] Create basic `<Marker>` component (default variant)
- [ ] Add `<NavigationControl>`
- [ ] Set up playground with hosted PMTiles (Hungary or similar)

**Deliverable:** Render a dark/light map with markers

---

### Phase 2: Interactivity

**Goal:** Full marker system and popups

- [ ] Marker variants (default, primary, destructive, success, warning)
- [ ] Marker sizes (sm, md, lg)
- [ ] Marker icons (iconify snippet)
- [ ] Marker pulse animation
- [ ] Marker labels (hover)
- [ ] `<Popup>` component
- [ ] Click/select interactions

**Deliverable:** Interactive map with styled markers and popups

---

### Phase 3: Advanced Components

**Goal:** Production-ready features

- [ ] `<ClusterLayer>` for marker clustering
- [ ] `<DetailsPanel>` with shadcn Drawer on mobile
- [ ] `<ScaleControl>`
- [ ] Mobile responsive behavior
- [ ] Accessibility (keyboard nav, ARIA)

**Deliverable:** Feature-complete library

---

### Phase 4: Polish & Release

**Goal:** Ready for npm

- [ ] TypeScript types exports
- [ ] Export styles as constants for user customization
- [ ] Playground with demo data
- [ ] Performance optimization
- [ ] Package publishing setup (bumpp)
- [ ] README with examples

---

### Post-MVP / Future

- [ ] `<SearchControl>` — Geocoding with Nominatim (find addresses)
- [ ] GeoJSON layer support
- [ ] Route display (just display, not calculate)
- [ ] Heatmap layer
- [ ] Custom tile style builder

---

## Technical Decisions

### Why MapLibre GL?

- Open source fork of Mapbox GL
- Vector tiles = smooth 60fps zooming
- Full style customization
- Active community
- No API key required for the library itself

### Why Not Leaflet?

- Raster tiles load in chunks (ugly)
- Can't style individual map elements
- Doesn't match shadcn's premium feel

### SSR Note

MapLibre GL requires browser APIs (`window`, `document`). This is a **userland concern**, not a library one.

Recommended approach in your SvelteKit app:

```typescript
// src/routes/+layout.ts
export const ssr = false
```

This will be documented but not handled by shadcn-map itself.

### Why Context Pattern?

Child components need access to the map instance. Svelte's context API is perfect:

```typescript
// In Map.svelte
setMapContext({ getMap: () => map, loaded: { current: loaded } });

// In Marker.svelte
const { getMap, loaded } = getMapContext();
```

### Why Iconify Snippets?

Your playground already uses iconify. Instead of a weird icon prop API:

```svelte
<!-- Clean snippet approach -->
<Marker lngLat={pos}>
  {#snippet icon()}
    <span class="i-ph-coffee" />
  {/snippet}
</Marker>
```

---

## Dependencies

### Library (`packages/map`)

```json
{
  "dependencies": {
    "maplibre-gl": "^4.x",
    "pmtiles": "^3.x"
  },
  "peerDependencies": {
    "svelte": "^5.0.0",
    "bits-ui": "^2.x",
    "mode-watcher": "^1.x"
  }
}
```

### Exports

```typescript
// Components
export { Map, Marker, Popup, DetailsPanel, ClusterLayer } from './components';
export { NavigationControl, ScaleControl } from './components/controls';

// Styles (for customization)
export { darkStyle, lightStyle, colors } from './styles';

// Context (for custom components)
export { getMapContext, setMapContext } from './context';

// Types
export type { MapProps, MarkerProps, PopupProps, ... } from './types';
```

---

## Directions / Navigation

**We do NOT implement routing/directions.** Too complex, overkill for this library.

Instead, provide a simple "Open in Google Maps" pattern in userland:

```svelte
<script>
  function openInGoogleMaps(lngLat: [number, number]) {
    const [lng, lat] = lngLat;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }
</script>

<Button onclick={() => openInGoogleMaps(selected.lngLat)}>
  <span class="i-ph-navigation" />
  Get Directions
</Button>
```

This delegates the complexity to Google Maps where it belongs.

---

## Success Criteria

A successful shadcn-map should:

1. **Look stunning** — First impression matters
2. **Feel fast** — Smooth 60fps interactions
3. **Be simple** — Drop-in usage with sensible defaults
4. **Be flexible** — Escape hatches for power users
5. **Match shadcn** — Same colors, same feel, same quality

---

## Resources

- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/)
- [Protomaps](https://protomaps.com/)
- [CARTO Basemaps](https://carto.com/basemaps/)
- [shadcn-svelte](https://shadcn-svelte.com/)
