<script lang='ts'>
  import type { MapLibreMap } from 'shadcn-map'
  import { Map as MapView, Marker, MarkerLayer, NavigationControl } from 'shadcn-map'
  import { onMount } from 'svelte'

  interface LongTaskSample {
    startTime: number
    duration: number
  }

  interface BenchmarkResult {
    renderer: 'dom' | 'layer'
    count: number
    mountMs: number
    markerDomNodes: number
    panFps: number
    panP95FrameMs: number
    panSlowFrames: number
    mountLongTasks: number
    panLongTasks: number
    heapMb: number | null
  }

  const searchParams = new URLSearchParams(window.location.search)
  const requestedCount = Number(searchParams.get('count'))
  const markerCount = requestedCount === 10_000 ? 10_000 : requestedCount === 1_000 ? 1_000 : requestedCount === 200 ? 200 : 100
  const renderer = searchParams.get('renderer') === 'dom' ? 'dom' : 'layer'
  const center: [number, number] = [19.0402, 47.4979]
  const markers = createMarkers(markerCount)

  let status = $state('Loading map...')
  let result = $state<BenchmarkResult | null>(null)
  const longTasks: LongTaskSample[] = []
  let observer: PerformanceObserver | null = null
  let frameRequest: number | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null
  let mapRef: MapLibreMap | null = null
  let mountStartedAt = 0
  let benchmarkStarted = false

  function createMarkers(count: number) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    return Array.from({ length: count }, (_, index) => {
      const normalizedRadius = Math.sqrt((index + 0.5) / count)
      const angle = index * goldenAngle

      return {
        id: `performance-marker-${index + 1}`,
        label: `Marker ${index + 1}`,
        lngLat: [
          center[0] + Math.cos(angle) * normalizedRadius * 0.28,
          center[1] + Math.sin(angle) * normalizedRadius * 0.18,
        ] as [number, number],
      }
    })
  }

  function waitForPaint(frames = 2): Promise<void> {
    return new Promise((resolve) => {
      const next = () => {
        if (frames === 0) {
          resolve()
          return
        }
        frames -= 1
        frameRequest = requestAnimationFrame(next)
      }
      next()
    })
  }

  function waitForMarkers(): Promise<void> {
    return new Promise((resolve, reject) => {
      const startedAt = performance.now()

      const check = () => {
        if (document.querySelectorAll('.performance-marker').length === markerCount) {
          resolve()
          return
        }
        if (performance.now() - startedAt > (markerCount === 10_000 ? 30_000 : 10_000)) {
          reject(new Error(`Timed out waiting for ${markerCount} markers`))
          return
        }
        frameRequest = requestAnimationFrame(check)
      }

      check()
    })
  }

  function countLongTasks(start: number, end: number) {
    if (observer) {
      longTasks.push(...observer.takeRecords().map(entry => ({
        startTime: entry.startTime,
        duration: entry.duration,
      })))
    }
    return longTasks.filter(task => task.startTime < end && task.startTime + task.duration > start).length
  }

  function getMarkerDomNodeCount() {
    return Array.from(document.querySelectorAll('.performance-marker'))
      .reduce((total, marker) => total + 1 + marker.querySelectorAll('*').length, 0)
  }

  function getHeapMb() {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : null
  }

  function measurePan(map: MapLibreMap, mountResult: Omit<BenchmarkResult, 'panFps' | 'panP95FrameMs' | 'panSlowFrames' | 'panLongTasks'>) {
    status = 'Measuring pan performance...'

    const frameDurations: number[] = []
    const panStartedAt = performance.now()
    const measurementDuration = 2_200
    let firstFrame: number | null = null
    let previousFrame: number | null = null
    let lastFrame: number | null = null
    let finished = false

    const finish = () => {
      if (finished)
        return
      finished = true

      const panEndedAt = performance.now()
      if (frameRequest !== null)
        cancelAnimationFrame(frameRequest)
      if (timeout !== null)
        clearTimeout(timeout)

      const sampledDuration = firstFrame !== null && lastFrame !== null ? lastFrame - firstFrame : 0
      const sortedFrames = frameDurations.toSorted((a, b) => a - b)
      const p95Index = Math.min(sortedFrames.length - 1, Math.floor(sortedFrames.length * 0.95))
      const benchmarkResult: BenchmarkResult = {
        ...mountResult,
        panFps: sampledDuration > 0 ? frameDurations.length / (sampledDuration / 1000) : 0,
        panP95FrameMs: sortedFrames[p95Index] ?? 0,
        panSlowFrames: frameDurations.filter(duration => duration > 20).length,
        panLongTasks: countLongTasks(panStartedAt, panEndedAt),
      }

      result = benchmarkResult
      status = 'Complete'
      ;(window as Window & { __SHADCN_MAP_MARKER_BENCHMARK__?: BenchmarkResult }).__SHADCN_MAP_MARKER_BENCHMARK__ = benchmarkResult
    }

    const sampleFrame = (timestamp: number) => {
      firstFrame ??= timestamp
      if (previousFrame !== null)
        frameDurations.push(timestamp - previousFrame)
      previousFrame = timestamp
      lastFrame = timestamp

      if (timestamp - panStartedAt >= measurementDuration) {
        finish()
        return
      }

      frameRequest = requestAnimationFrame(sampleFrame)
    }

    frameRequest = requestAnimationFrame(sampleFrame)
    map.panBy([320, 0], { duration: 2_000, easing: t => t, essential: true })
    timeout = setTimeout(finish, 4_000)
  }

  async function finishMountBenchmark() {
    if (!mapRef || benchmarkStarted) {
      return
    }
    benchmarkStarted = true

    try {
      await waitForPaint()
      const mountEndedAt = performance.now()

      measurePan(mapRef, {
        renderer,
        count: markerCount,
        mountMs: mountEndedAt - mountStartedAt,
        markerDomNodes: getMarkerDomNodeCount(),
        mountLongTasks: countLongTasks(mountStartedAt, mountEndedAt),
        heapMb: getHeapMb(),
      })
    }
    catch (error) {
      status = error instanceof Error ? error.message : String(error)
    }
  }

  async function handleMapLoad(map: MapLibreMap) {
    mapRef = map
    mountStartedAt = performance.now()
    status = `Mounting ${markerCount} ${renderer === 'layer' ? 'layer' : 'DOM'} markers...`

    if (renderer === 'dom') {
      try {
        await waitForMarkers()
        await finishMountBenchmark()
      }
      catch (error) {
        status = error instanceof Error ? error.message : String(error)
      }
    }
  }

  function handleLayerReady() {
    if (renderer === 'layer') {
      void finishMountBenchmark()
    }
  }

  onMount(() => {
    try {
      observer = new PerformanceObserver((list) => {
        longTasks.push(...list.getEntries().map(entry => ({
          startTime: entry.startTime,
          duration: entry.duration,
        })))
      })
      observer.observe({ entryTypes: ['longtask'] })
    }
    catch {
      observer = null
    }

    return () => {
      observer?.disconnect()
      if (frameRequest !== null)
        cancelAnimationFrame(frameRequest)
      if (timeout !== null)
        clearTimeout(timeout)
    }
  })
</script>

<svelte:head>
  <title>Marker performance | shadcn-map</title>
</svelte:head>

<div class='text-foreground bg-background h-full w-full relative'>
  <MapView
    tiles='/hungary.pmtiles'
    {center}
    zoom={10}
    maxZoom={15}
    labels='minimal'
    onload={handleMapLoad}
  >
    {#if renderer === 'layer'}
      <MarkerLayer points={markers} color='#2563eb' icon='i-ph:map-pin-fill' onready={handleLayerReady} />
    {:else}
      {#each markers as marker (marker.id)}
        <Marker
          class='performance-marker'
          lngLat={marker.lngLat}
          color='bg-[#2563eb] dark:bg-[#2563eb]'
          textColor='text-white'
          icon='i-ph:map-pin-fill'
          label={marker.label}
        />
      {/each}
    {/if}

    <NavigationControl position='bottom-right' />
  </MapView>

  <section class='p-4 border rounded-xl bg-background/95 w-[min(23rem,calc(100%-2rem))] shadow-xl left-4 top-4 absolute z-10 backdrop-blur'>
    <div class='flex gap-4 items-start justify-between'>
      <div>
        <p class='text-xs text-muted-foreground tracking-wider font-medium uppercase'>No clustering</p>
        <h1 class='text-lg font-semibold'>Marker performance</h1>
      </div>
    </div>

    <div class='text-sm mt-3 flex flex-wrap gap-2'>
      <div class='p-1 border rounded-md flex'>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${renderer === 'layer' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=layer&count=${markerCount}`}>Layer</a>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${renderer === 'dom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=dom&count=${markerCount}`}>DOM</a>
      </div>
      <div class='p-1 border rounded-md flex'>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${markerCount === 100 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=${renderer}&count=100`}>100</a>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${markerCount === 200 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=${renderer}&count=200`}>200</a>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${markerCount === 1_000 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=${renderer}&count=1000`}>1000</a>
        <a data-sveltekit-reload class={`rounded px-3 py-1.5 ${markerCount === 10_000 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} href={`?renderer=${renderer}&count=10000`}>10k</a>
      </div>
    </div>

    <p class='text-sm text-muted-foreground mt-3'>{status}</p>

    {#if result}
      <output
        class='text-sm mt-4 gap-2 grid grid-cols-2'
        data-benchmark-result
        data-renderer={result.renderer}
        data-count={result.count}
        data-mount-ms={result.mountMs.toFixed(1)}
        data-dom-nodes={result.markerDomNodes}
        data-pan-fps={result.panFps.toFixed(1)}
        data-pan-p95-ms={result.panP95FrameMs.toFixed(1)}
        data-slow-frames={result.panSlowFrames}
        data-mount-long-tasks={result.mountLongTasks}
        data-pan-long-tasks={result.panLongTasks}
        data-heap-mb={result.heapMb?.toFixed(1) ?? 'unavailable'}
      >
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.mountMs.toFixed(1)} ms</strong>Marker mount</span>
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.panFps.toFixed(1)}</strong>Pan FPS</span>
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.panP95FrameMs.toFixed(1)} ms</strong>p95 frame</span>
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.panSlowFrames}</strong>Frames over 20 ms</span>
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.markerDomNodes}</strong>Marker DOM nodes</span>
        <span class='p-2 rounded-md bg-muted'><strong class='text-base block'>{result.mountLongTasks + result.panLongTasks}</strong>Long tasks</span>
        {#if result.heapMb !== null}
          <span class='p-2 rounded-md bg-muted col-span-2'><strong class='text-base block'>{result.heapMb.toFixed(1)} MB</strong>JS heap after mount</span>
        {/if}
      </output>
    {/if}

    <p class='text-xs text-muted-foreground leading-relaxed mt-3'>Mount timing starts after the base map loads. The pan test moves 320 px over two seconds and records animation-frame timing.</p>
  </section>
</div>
