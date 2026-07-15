# shadcn-map

A minimal and fast map library for Svelte 5 with [shadcn](https://shadcn-svelte.com/) design.
Uses [MapLibre GL](https://maplibre.org/) and [Protomaps](https://protomaps.com/) for vector tiles.

Recommended to use with [UnoCSS](https://unocss.dev/), and [unocss-preset-shadcn](https://github.com/Rettend/unocss-preset-shadcn/).

## install

```cmd
bun i shadcn-map
```

Peer dependencies:

```bash
bun i svelte@^5.0.0 bits-ui mode-watcher
```

## Usage

### Basic Map

```svelte
<script lang="ts">
  import { Map, Marker, NavigationControl } from 'shadcn-map';
</script>

<div class="h-600px w-full rounded-lg border overflow-hidden">
  <!-- Map data for development -->
  <Map
    center={[-74.006, 40.7128]}
    zoom={12}
    tiles="https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles"
  >
    <NavigationControl position="top-right" />
    
    <Marker 
      lngLat={[-74.006, 40.7128]} 
      label="New York"
      color="primary" 
    />
  </Map>
</div>
```

### Marker badges

`<Marker>` badges support both legacy UnoCSS/Iconify class icons and inline SVG badges:

```svelte
<script lang="ts">
  import { Marker } from 'shadcn-map'

  const badges = [
    {
      icon: 'i-ph:drop-duotone',
      color: 'bg-sky-600',
      label: 'Legacy class badge',
    },
    {
      svgBody: '<path d="M128 24L32 80v96l96 56l96-56V80Z" opacity=".2"></path><path d="M128 24L32 80v96l96 56l96-56V80Z"></path>',
      svgWidth: 256,
      svgHeight: 256,
      color: 'bg-violet-700',
      label: 'Inline SVG badge',
    },
  ]
</script>

<Marker lngLat={[-74.006, 40.7128]} badges={badges} />
```

### Bulk markers

Use `<MarkerLayer>` for hundreds or thousands of non-clustered markers. It renders one GeoJSON source with MapLibre circle and symbol layers instead of creating a DOM node and `maplibregl.Marker` for every point.

```svelte
<script lang="ts">
  import { Map, MarkerLayer } from 'shadcn-map'

  const locations = [
    { id: 'nyc', lngLat: [-74.006, 40.7128], label: 'New York' },
    { id: 'phl', lngLat: [-75.1652, 39.9526], label: 'Philadelphia' },
  ]
</script>

<Map tiles="/region.pmtiles">
  <MarkerLayer
    points={locations}
    color="#2563eb"
    icon="i-ph:coffee-fill"
    iconColor="#ffffff"
    onclick={point => console.log(point.label)}
  />
</Map>
```

Icons can be an Iconify/UnoCSS class or trusted inline SVG body:

```svelte
<MarkerLayer
  points={locations.map(location => ({
    ...location,
    icon: {
      svgBody: '<path fill="currentColor" d="..."/>',
      svgWidth: 256,
      svgHeight: 256,
    },
  }))}
/>
```

Marker IDs must be stable and unique. Replace the `points` array to update the source. Dynamically generated Iconify class names must be included in your UnoCSS safelist so their CSS is available at runtime. `<MarkerLayer>` supports concrete CSS colors, per-point icons and sizes, active rings, hover labels, and pointer events. Use the DOM-based `<Marker>` when you need badges, dragging, keyboard focus, or arbitrary HTML.

## Components

- **Map**:
  - **`<Map>`**: The core container. Renders MapLibre GL.
  - **`<Marker>`**: Styled pins with shadcn theme colors, icons and badges.
  - **`<MarkerLayer>`**: GPU-rendered bulk markers for large datasets.
  - **`<ClusterLayer>`**: Auto-clustering for markers.
- **UI**:
  - **`<Popup>`**: In-place info popup.
  - **`<DetailsPanel>`**: Full-height sidebar or bottom drawer.
- **Controls**:
  - **`<NavigationControl>`**: Zoom and compass controls.
  - **`<ScaleControl>`**: Distance scale bar.
  - **`<GeolocateControl>`**: Show user location.

## Styles

The map comes with two minimal styles:

- **Dark**: Dark zinc colors, subtle roads, dark blue water.
- **Light**: Clean white/zinc colors, minimal distractions.

Labels:

- **Minimal**: City names, roads, water.
- **Roads**: Show road names too.

## License

MIT
