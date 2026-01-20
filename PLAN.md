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

Styled markers with theme colors, icons, and animations.

```svelte
<Marker
  lngLat={[-74.006, 40.7128]}
  color="primary"
  size="md"
  pulse
  label="HQ"
  icon="i-ph-building"
  onclick={() => selected = marker}
/>
```

**Colors:**

Use any shadcn theme token like `primary`, `accent`, `chart-1`, `sidebar-accent`, etc.

**Sizes:** `sm`, `md`, `lg`

**Features:**

- Iconify/UnoCSS icons via class string
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

For richer content. Slides in from the left (or bottom on mobile).

```svelte
<DetailsPanel open={!!selected} onclose={() => selected = null}>
  <div class="p-6">
    <h2 class="text-2xl font-bold">{selected.name}</h2>
    <!-- Rich content, images, actions, etc. -->
  </div>
</DetailsPanel>
```

**Behavior:**

- Desktop: Full-height panel on left side, **floating over the map**
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

### Licensing (Commercial Use)

| Component | License | Commercial? |
| :-------- | :------ | :---------- |
| PMTiles format | Public Domain (CC0) | ✅ Free |
| OSM data | ODbL | ✅ Free with attribution |
| Protomaps styles | CC0 | ✅ Free |
| Daily builds download | Free | ✅ Self-host commercially |
| Hosted API (`api.protomaps.com`) | Sponsor required | ❌ Not for us |

**Key point:** Downloading from `maps.protomaps.com/builds/` and self-hosting is **100% free for commercial use**. Only the hosted API requires sponsorship.

**Required attribution:** `© OpenStreetMap` (already included in our map styles)

---

### Primary Workflow: Protomaps Daily Builds

The simplest approach — use Protomaps' pre-built tiles:

1. **Download & extract your region:**

   ```bash
   # Install pmtiles CLI
   npm install -g pmtiles
   
   # Download latest daily build and extract Hungary
   # Bounding box: [minLon, minLat, maxLon, maxLat]
   pmtiles extract \
     https://build.protomaps.com/20260108.pmtiles \
     hungary.pmtiles \
     --bbox=16.1,45.7,22.9,48.6
   
   # Result: ~200-400MB file for Hungary
   ```

2. **Upload to Cloudflare R2:**

   ```bash
   # Using rclone (recommended for large files)
   rclone copy hungary.pmtiles r2:your-bucket/tiles/
   
   # Or use Cloudflare dashboard for smaller files
   ```

3. **Serve via Cloudflare Worker** (optional, for custom domain):

   Use the [Protomaps Cloudflare Worker template](https://github.com/protomaps/PMTiles/tree/main/serverless/cloudflare) or serve directly from R2 public URL.

4. **Use in your app:**

   ```svelte
   <Map tiles="https://your-r2-bucket.r2.dev/tiles/hungary.pmtiles" />
   ```

### Automated Monthly Updates (GitHub Actions)

```yaml
# .github/workflows/update-tiles.yml
name: Update PMTiles

on:
  schedule:
    - cron: '0 4 1 * *'  # Monthly on 1st at 4am UTC
  workflow_dispatch:      # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Install pmtiles
        run: npm install -g pmtiles

      - name: Get latest build date
        id: date
        run: echo "date=$(date -u +%Y%m%d)" >> $GITHUB_OUTPUT

      - name: Extract Hungary from daily build
        run: |
          pmtiles extract \
            "https://build.protomaps.com/${{ steps.date.outputs.date }}.pmtiles" \
            hungary.pmtiles \
            --bbox=16.1,45.7,22.9,48.6

      - name: Upload to R2
        run: |
          # Install and configure rclone for R2
          # Upload hungary.pmtiles to your bucket
        env:
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
```

---

### Backup: Build Tiles Yourself

If you need custom layers, different zoom levels, or want full control:

#### Workflow: Geofabrik → Planetiler → R2

1. **Download OSM data from Geofabrik:**

   ```bash
   wget https://download.geofabrik.de/europe/hungary-latest.osm.pbf
   ```

2. **Run Planetiler** (requires Java, 8GB+ RAM):

   ```bash
   java -Xmx8g -jar planetiler.jar \
     --osm-path=hungary-latest.osm.pbf \
     --output=hungary.pmtiles \
     --nodemap-type=array \
     --storage=mmap
   ```

3. **Upload to R2** as above.

**Note:** This is the same pipeline Protomaps uses for their daily builds. Only needed if you want:

- Different layer schemas
- Higher/lower zoom levels
- Custom processing

---

### For Development

Use a public demo file for quick testing:

```svelte
<Map tiles="https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles" />
```

---

## Implementation Phases

### Phase 1: Foundation ✦ MVP

**Goal:** Basic map with markers working

- [x] Set up library package structure with proper exports
- [x] Install MapLibre GL + pmtiles
- [x] Implement `<Map>` component with PMTiles support
- [x] Create dark + light minimal styles
- [x] Integrate with mode-watcher for auto theme
- [x] Implement context for child components (using Svelte 5 $state in .svelte.ts)
- [x] Create basic `<Marker>` component (default variant)
- [x] Add `<NavigationControl>`
- [x] Add `<ScaleControl>` (moved from Phase 3)
- [x] Set up playground with hosted PMTiles

**Deliverable:** Render a dark/light map with markers ✅

---

### Phase 2: Interactivity

**Goal:** Full marker system and popups

- [x] Marker colors (shadcn theme tokens)
- [x] Marker sizes (sm, md, lg)
- [x] Marker icons (icon class)
- [x] Marker pulse animation
- [x] Marker labels (hover)
- [x] `<Popup>` component
- [x] Click/select interactions

**Deliverable:** Interactive map with styled markers and popups

---

### Phase 3: Advanced Components

**Goal:** Production-ready features

- [x] `<ClusterLayer>` for marker clustering
- [x] `<DetailsPanel>` with shadcn Drawer on mobile
- [x] Mobile responsive behavior
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

### Why Iconify Classes?

Your playground already uses Iconify via UnoCSS. The simplest API is an icon
class string:

```svelte
<Marker lngLat={pos} icon="i-ph-coffee" />
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
