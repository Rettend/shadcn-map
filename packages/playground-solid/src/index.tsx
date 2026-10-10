import { render } from '@solidjs/web'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { App } from './App'
import './styles.css'

setWorkerUrl(workerUrl)

const root = document.getElementById('app')
if (!root) {
  throw new Error('Missing #app root element.')
}

const dispose = render(() => <App />, root)

if (import.meta.hot) {
  import.meta.hot.dispose(dispose)
}
