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

## Components

- **Map**:
  - **`<Map>`**: The core container. Renders MapLibre GL.
  - **`<Marker>`**: Styled pins with shadcn theme colors, icons and badges.
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
