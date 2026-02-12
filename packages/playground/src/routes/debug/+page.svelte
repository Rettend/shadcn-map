<script lang='ts'>
  import { onMount } from 'svelte'

  // The URL to your PMTiles file on R2. Change this to match your deployed setup.
  // Using relative URL for local testing, but you should test with your actual R2 URL too.
  const LOCAL_TILES_URL = '/hungary.pmtiles'

  // Set this to your actual R2-hosted PMTiles URL for CORS testing
  const R2_TILES_URL = '' // e.g. 'https://map.yourdomain.com/tiles.pmtiles'

  interface TestResult {
    name: string
    status: 'pending' | 'pass' | 'fail' | 'warn'
    message: string
    details?: string
  }

  let results = $state<TestResult[]>([
    { name: 'User Agent', status: 'pending', message: 'Checking...' },
    { name: 'WebGL Support', status: 'pending', message: 'Checking...' },
    { name: 'WebGL2 Support', status: 'pending', message: 'Checking...' },
    { name: 'Web Workers (blob URL)', status: 'pending', message: 'Checking...' },
    { name: 'Web Workers (data URL)', status: 'pending', message: 'Checking...' },
    { name: 'Fetch API', status: 'pending', message: 'Checking...' },
    { name: 'Range Requests (local)', status: 'pending', message: 'Checking...' },
    { name: 'Range Requests (R2/CORS)', status: 'pending', message: 'Checking...' },
    { name: 'PMTiles Header Parse', status: 'pending', message: 'Checking...' },
    { name: 'MapLibre GL Init', status: 'pending', message: 'Checking...' },
  ])

  let mapContainer: HTMLDivElement

  function update(name: string, status: TestResult['status'], message: string, details?: string) {
    results = results.map(r => r.name === name ? { ...r, status, message, details } : r)
  }

  onMount(async () => {
    // 1. User Agent
    const ua = navigator.userAgent
    const isFBIAB = /FBAN|FBAV|FB_IAB|FBIOS|FBBV|FBDV/i.test(ua)
    const isInstagram = /Instagram/i.test(ua)
    const isInApp = isFBIAB || isInstagram || /Line|MicroMessenger|Twitter|Snapchat/i.test(ua)
    update('User Agent', isInApp ? 'warn' : 'pass', isInApp ? `In-app browser detected` : 'Regular browser', ua)

    // 2. WebGL Support
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
        const renderer = debugInfo
          ? (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : 'unknown'
        update('WebGL Support', 'pass', `WebGL available`, `Renderer: ${renderer}`)
      }
      else {
        update('WebGL Support', 'fail', 'WebGL NOT available — MapLibre cannot render', 'This is likely the main issue. The map requires WebGL.')
      }
    }
    catch (e) {
      update('WebGL Support', 'fail', `WebGL check threw error: ${e}`)
    }

    // 3. WebGL2 Support
    try {
      const canvas = document.createElement('canvas')
      const gl2 = canvas.getContext('webgl2')
      update('WebGL2 Support', gl2 ? 'pass' : 'warn', gl2 ? 'WebGL2 available' : 'WebGL2 NOT available (WebGL1 fallback may work)')
    }
    catch (e) {
      update('WebGL2 Support', 'warn', `WebGL2 check threw error: ${e}`)
    }

    // 4. Web Workers (blob URL)
    try {
      const blob = new Blob(['self.postMessage("ok")'], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      const result = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 3000)
        try {
          const worker = new Worker(url)
          worker.onmessage = (e) => {
            clearTimeout(timeout)
            worker.terminate()
            URL.revokeObjectURL(url)
            resolve(e.data)
          }
          worker.onerror = (e) => {
            clearTimeout(timeout)
            worker.terminate()
            URL.revokeObjectURL(url)
            reject(new Error(e.message || 'Worker error'))
          }
        }
        catch (e) {
          clearTimeout(timeout)
          reject(e)
        }
      })
      update('Web Workers (blob URL)', result === 'ok' ? 'pass' : 'fail', result === 'ok' ? 'Blob URL workers work' : `Unexpected response: ${result}`)
    }
    catch (e: any) {
      update('Web Workers (blob URL)', 'fail', `Blob URL workers BLOCKED — this breaks default MapLibre`, `Error: ${e.message}. Fix: use workerUrl prop to load CSP worker from a hosted file.`)
    }

    // 5. Web Workers (data URL fallback)
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 3000)
        try {
          const worker = new Worker('data:application/javascript,self.postMessage("ok")')
          worker.onmessage = (e) => {
            clearTimeout(timeout)
            worker.terminate()
            resolve(e.data)
          }
          worker.onerror = (e) => {
            clearTimeout(timeout)
            worker.terminate()
            reject(new Error(e.message || 'Worker error'))
          }
        }
        catch (e) {
          clearTimeout(timeout)
          reject(e)
        }
      })
      update('Web Workers (data URL)', result === 'ok' ? 'pass' : 'fail', result === 'ok' ? 'Data URL workers work' : `Unexpected response: ${result}`)
    }
    catch (e: any) {
      update('Web Workers (data URL)', 'fail', `Data URL workers also blocked`, `Error: ${e.message}`)
    }

    // 6. Fetch API
    try {
      if (!('fetch' in globalThis)) {
        update('Fetch API', 'fail', 'fetch() is NOT available')
      }
      else {
        update('Fetch API', 'pass', 'fetch() available')
      }
    }
    catch (e) {
      update('Fetch API', 'fail', `Error: ${e}`)
    }

    // 7. Range Requests (local)
    try {
      const resp = await fetch(LOCAL_TILES_URL, {
        headers: { range: 'bytes=0-511' },
      })
      const contentRange = resp.headers.get('content-range')
      const contentLength = resp.headers.get('content-length')

      if (resp.status === 206) {
        update('Range Requests (local)', 'pass', `HTTP 206 — Range requests work`, `Content-Range: ${contentRange}, Content-Length: ${contentLength}`)
      }
      else if (resp.status === 200) {
        update('Range Requests (local)', 'warn', `HTTP 200 — server returned full file instead of range (Range header may be stripped)`, `Content-Length: ${contentLength}. PMTiles may still work if the file is small, but this breaks large archives.`)
      }
      else {
        update('Range Requests (local)', 'fail', `HTTP ${resp.status} — unexpected response`, `Status: ${resp.status} ${resp.statusText}`)
      }
    }
    catch (e: any) {
      update('Range Requests (local)', 'fail', `Fetch failed: ${e.message}`)
    }

    // 8. Range Requests (R2/CORS)
    if (!R2_TILES_URL) {
      update('Range Requests (R2/CORS)', 'warn', 'Skipped — set R2_TILES_URL in this page to test', 'Edit the R2_TILES_URL variable at the top of debug/+page.svelte')
    }
    else {
      try {
        const resp = await fetch(R2_TILES_URL, {
          headers: { range: 'bytes=0-511' },
        })
        const contentRange = resp.headers.get('content-range')
        const corsOrigin = resp.headers.get('access-control-allow-origin')

        if (resp.status === 206) {
          update('Range Requests (R2/CORS)', 'pass', `HTTP 206 — R2 range + CORS works`, `Content-Range: ${contentRange}, ACAO: ${corsOrigin}`)
        }
        else if (resp.status === 200) {
          update('Range Requests (R2/CORS)', 'warn', `HTTP 200 — Range header may be stripped by proxy or R2 config`, `ACAO: ${corsOrigin}`)
        }
        else if (resp.status === 0) {
          update('Range Requests (R2/CORS)', 'fail', `CORS blocked — the browser refused the cross-origin request`, `Make sure R2 CORS is configured with: Access-Control-Allow-Headers: Range`)
        }
        else {
          update('Range Requests (R2/CORS)', 'fail', `HTTP ${resp.status}`, `ACAO: ${corsOrigin}`)
        }
      }
      catch (e: any) {
        update('Range Requests (R2/CORS)', 'fail', `Fetch failed — likely a CORS issue`, `Error: ${e.message}. Ensure R2 bucket CORS allows Origin, Range header, and exposes ETag, Content-Range.`)
      }
    }

    // 9. PMTiles Header Parse
    try {
      // @ts-ignore — pmtiles is resolved via shadcn-map workspace dep
      const { PMTiles } = await import('pmtiles')
      const pm = new PMTiles(LOCAL_TILES_URL)
      const header = await pm.getHeader()
      update('PMTiles Header Parse', 'pass', `PMTiles OK — zoom ${header.minZoom}-${header.maxZoom}`, `Bounds: [${header.minLon.toFixed(2)}, ${header.minLat.toFixed(2)}, ${header.maxLon.toFixed(2)}, ${header.maxLat.toFixed(2)}], Tile type: ${header.tileType}`)
    }
    catch (e: any) {
      update('PMTiles Header Parse', 'fail', `PMTiles header parsing failed`, `Error: ${e.message}. This means the Range request returned invalid data — likely the full file instead of the requested byte range.`)
    }

    // 10. MapLibre GL Init
    try {
      // @ts-ignore — maplibre-gl is resolved via shadcn-map workspace dep
      const maplibregl = (await import('maplibre-gl')).default
      // @ts-ignore
      const { Protocol } = await import('pmtiles')

      // Try setting worker URL if available
      try {
        maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js')
      }
      catch {}

      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)

      const map = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {},
          layers: [{
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#1a1a2e' },
          }],
        },
        center: [19.04, 47.5],
        zoom: 10,
        interactive: false,
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Map load timeout (5s)')), 5000)
        map.on('load', () => {
          clearTimeout(timeout)
          resolve()
        })
        map.on('error', (e: any) => {
          clearTimeout(timeout)
          reject(new Error(e.error?.message || e.message || 'Unknown map error'))
        })
      })

      update('MapLibre GL Init', 'pass', 'MapLibre initialized and rendered successfully')
      maplibregl.removeProtocol('pmtiles')
      map.remove()
    }
    catch (e: any) {
      update('MapLibre GL Init', 'fail', `MapLibre failed to initialize`, `Error: ${e.message}. If WebGL is not available, this is expected.`)
    }
  })

  const statusIcon: Record<TestResult['status'], string> = {
    pending: '⏳',
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
  }
</script>

<svelte:head>
  <title>Map Debug</title>
</svelte:head>

<div class='text-sm font-mono mx-auto p-4 max-w-2xl'>
  <h1 class='text-lg font-bold mb-4'>Map Diagnostics</h1>
  <p class='text-xs mb-4 opacity-70'>Open this page in the Facebook Messenger browser to find out what's broken.</p>

  <div class='space-y-3'>
    {#each results as test}
      <div class='p-3 border border-zinc-700 rounded' class:border-red-500={test.status === 'fail'} class:border-green-600={test.status === 'pass'} class:border-yellow-500={test.status === 'warn'}>
        <div class='flex gap-2 items-start'>
          <span>{statusIcon[test.status]}</span>
          <div class='flex-1 min-w-0'>
            <div class='font-bold'>{test.name}</div>
            <div class='opacity-80'>{test.message}</div>
            {#if test.details}
              <div class='text-xs mt-1 opacity-60 break-all'>{test.details}</div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Hidden container for MapLibre test -->
  <div bind:this={mapContainer} class='mt-4 opacity-50 h-32 w-32'></div>

  <div class='mt-6 p-3 border border-zinc-700 rounded'>
    <div class='font-bold mb-2'>R2 CORS Checklist</div>
    <div class='text-xs opacity-70 space-y-1'>
      <p>Your R2 bucket needs these CORS headers for PMTiles to work cross-origin:</p>
      <pre class='mt-2 p-2 rounded bg-zinc-900 overflow-x-auto'>Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Range, If-Match
Access-Control-Expose-Headers: Content-Length, Content-Range, ETag
Access-Control-Max-Age: 86400</pre>
    </div>
  </div>
</div>
