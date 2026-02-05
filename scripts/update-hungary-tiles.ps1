# Update Hungary PMTiles from Protomaps Daily Builds

$ErrorActionPreference = "Stop"

$OUTPUT_FILE = "hungary.pmtiles"
$MAX_ZOOM = 15
$HUNGARY_BBOX = "16.0,45.7,23.0,48.7"

Write-Host "🗺️  Starting Hungary PMTiles extraction..." -ForegroundColor Cyan
Write-Host "📦 Output: $OUTPUT_FILE"
Write-Host "🔍 Max zoom: $MAX_ZOOM"
Write-Host "📍 Bounding box: $HUNGARY_BBOX"

$PROTOMAPS_URL = if ($env:PROTOMAPS_SOURCE_URL) { $env:PROTOMAPS_SOURCE_URL } else { "https://build.protomaps.com/20260205.pmtiles" }
Write-Host "🌐 Source: $PROTOMAPS_URL"

$pmtilesBin = $null
$binDir = ".\node_modules\.bin"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

try {
    if (Test-Path "$binDir\pmtiles.exe") {
        $pmtilesBin = "$binDir\pmtiles.exe"
        Write-Host "✅ Using local pmtiles: $pmtilesBin"
    } else {
        $null = Get-Command pmtiles -ErrorAction Stop
        $pmtilesBin = "pmtiles"
        Write-Host "✅ Using global pmtiles"
    }
} catch {
    Write-Host "❌ pmtiles CLI not found. Installing to $binDir..." -ForegroundColor Yellow
    
    $PMTILES_VERSION = "1.22.1"
    $PMTILES_TAG = "v$PMTILES_VERSION"
    $PMTILES_URL = "https://github.com/protomaps/go-pmtiles/releases/download/$PMTILES_TAG/go-pmtiles_${PMTILES_VERSION}_Windows_x86_64.zip"
    $tempZip = "$binDir\pmtiles.zip"
    
    Write-Host "📥 Downloading pmtiles from $PMTILES_URL..."
    Invoke-WebRequest -Uri $PMTILES_URL -OutFile $tempZip
    
    Expand-Archive -Path $tempZip -DestinationPath $binDir -Force
    Remove-Item $tempZip
    
    $pmtilesBin = "$binDir\pmtiles.exe"
    Write-Host "✅ Downloaded pmtiles.exe to $pmtilesBin"
}

Write-Host ""
Write-Host "🔄 Extracting Hungary region (this may take a few minutes)..." -ForegroundColor Cyan

& $pmtilesBin extract `
    $PROTOMAPS_URL `
    $OUTPUT_FILE `
    --bbox=$HUNGARY_BBOX `
    --maxzoom=$MAX_ZOOM `
    --download-threads=4

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Extraction failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Extraction complete!" -ForegroundColor Green
& $pmtilesBin show $OUTPUT_FILE

$fileInfo = Get-Item $OUTPUT_FILE
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host ""
Write-Host "📊 File size: $fileSizeMB MB" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎉 Hungary PMTiles ready: $OUTPUT_FILE" -ForegroundColor Green
Write-Host "   Next step: Upload to Cloudflare R2"
