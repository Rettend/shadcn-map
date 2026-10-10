# shadcn-map

A minimal and fast map library for Svelte 5 and Solid 2 with [shadcn](https://ui.shadcn.com/) design.
Uses [MapLibre GL](https://maplibre.org/) and [Protomaps](https://protomaps.com/) for vector tiles.

Recommended to use with [UnoCSS](https://unocss.dev/), and [unocss-preset-shadcn](https://github.com/Rettend/unocss-preset-shadcn/).

## Install

### Svelte 5

```cmd
bun add shadcn-map svelte@^5.0.0 maplibre-gl@^6.13.0
```

For `style="auto"`, configure your theme provider (for example `mode-watcher`) to toggle the document's `.dark` class.

### Solid 2

```bash
bun add shadcn-map solid-js@2.0.0-rc.14 @solidjs/web@2.0.0-rc.14 maplibre-gl@^6.13.0
```

### MapLibre worker

MapLibre 6 requires WebGL2 and a worker URL. For Vite applications, run this once in your browser entry before rendering a map:

```ts
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)
```

In SvelteKit, put the setup in your root layout and guard the call with `browser` from `$app/env`. For other bundlers, follow [MapLibre's installation guide](https://maplibre.org/maplibre-gl-js/docs/).

## Usage

### Svelte 5

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

### Solid 2

The Solid entry targets Solid 2.0.0-rc.14. Import its stylesheet once in your application:

```tsx
import { Map, Marker, NavigationControl } from 'shadcn-map/solid'
import 'shadcn-map/solid.css'

export default function MapPage() {
  return (
    <div class="h-600px w-full overflow-hidden rounded-lg border">
      <Map
        center={[-74.006, 40.7128]}
        zoom={12}
        tiles="https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles"
      >
        <NavigationControl position="top-right" />
        <Marker lngLat={[-74.006, 40.7128]} label="New York" color="primary" />
      </Map>
    </div>
  )
}
```

Solid applications should use `jsxImportSource: "@solidjs/web"`. Configure the Solid Vite plugin so it transforms the package's preserved JSX and resolves the `solid` export condition:

```ts
import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    dedupe: ['solid-js', '@solidjs/web'],
  },
  plugins: [solid({ extensions: ['.jsx', '.tsx'] })],
})
```

The map renders an SSR-safe container and initializes MapLibre in the browser. Pass signal values directly to props, such as `points={points()}`. Layer data also supports nested updates from Solid stores.

## Solid Playground

The repository includes a responsive Solid example with filtering, GPU markers, DOM markers, badges, popups, controls, geolocation, details, and live theme switching:

```bash
bun run dev:solid
```

See [`packages/playground-solid`](https://github.com/Rettend/shadcn-map/tree/main/packages/playground-solid).

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
    points={locations.map(location => ({
      ...location,
      badges: [
        { icon: 'i-ph:wifi-high-bold', color: 'bg-red-600', label: 'Wi-Fi' },
      ],
    }))}
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

The same inline SVG icon object can be passed to `<Marker>`, allowing DOM and GPU markers to reuse exact visuals. `<MarkerLayer>` also accepts the same `MarkerBadge[]` values as `<Marker>` at the layer or point level. Badges at the same position collapse into a count and expand into their individual GPU-rendered badges on hover; badge labels use the layer's shared hover tooltip. Layer images are resolved before their source and layers are added, so a marker does not swap from a temporary default to its custom icon.

Marker IDs must be stable and unique. Replace the `points` array to update the source. Dynamically generated Iconify class names must be included in your UnoCSS safelist so their CSS is available at runtime. Custom layer icons and badges are rasterized through a Blob URL, so strict Content Security Policies should allow `blob:` in `img-src`; otherwise the layer uses its default icon. `<MarkerLayer>` supports concrete CSS colors, per-point icons, badges and sizes, active rings, hover labels, and pointer events. Use the DOM-based `<Marker>` when you need dragging, keyboard focus, or arbitrary HTML.

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

## Development

Install workspace dependencies with `bun install`. The library source is organized by framework:

```text
packages/map/src/
  svelte/  Svelte components and context
  solid/   Solid components and context
  shared/  Styles, types, and marker rendering helpers
```

Both playgrounds use Vite+. The library uses Svelte's packager and `vp pack` (tsdown) to publish its two adapters.

- `bun run package` builds the library.
- `bun run watch` rebuilds both library adapters when their source changes.
- `bun run dev`, `bun run build`, and `bun run preview` run both playgrounds.
- Add `:svelte` or `:solid` to `dev`, `build`, or `preview` to run one playground, such as `bun run dev:svelte`.
- `bun run check` runs static checks for the toolchain, library, and both playgrounds.
- `bun run test` runs the Bun regression tests.
- `bun run lint` runs Oxlint and the Svelte-specific ESLint rules.
- `bun run fmt` formats with Oxfmt; `bun run fmt:check` checks formatting.

Solid checks use TypeScript 7. Svelte checking and declaration generation use TypeScript 6's compiler API.

### Release to npm

Land the intended changes on `origin/main` and configure your npm publishing credentials. From the repository root, run:

```bash
bun run release
```

The GitButler-aware `gb-release` CLI checks the release branch and lets you choose a version. The wrapper checks npm authentication before any release changes. Preparation updates the library version in `bun.lock`, runs checks and tests, builds both playgrounds, and dry-runs the npm package. The CLI then commits the version files, tags and pushes the release, and publishes `shadcn-map` to npm. It restores the GitButler workspace afterward.

If publishing fails after the release commit and tag were pushed, retry without another version bump:

```bash
bun run release --publish-only
```

The retry requires the checked-out branch, remote tip, and release tag to identify the same release commit. Only the library is published, not the playgrounds.

## License

MIT
