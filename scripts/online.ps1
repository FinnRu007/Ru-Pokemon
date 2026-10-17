# Startet den Spielserver und macht ihn ueber einen kostenlosen Cloudflare Quick Tunnel
# aus dem Internet erreichbar. Kein Konto noetig. Die Adresse aendert sich bei jedem Start.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
$port = 3000

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host 'Installiere Abhaengigkeiten ...'
  & npm install --no-fund --no-audit
}

$tools = Join-Path $root 'tools'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$cf = Join-Path $tools 'cloudflared.exe'
if (-not (Test-Path $cf)) {
  Write-Host 'Lade cloudflared herunter (einmalig, kostenlos) ...'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -UseBasicParsing -OutFile $cf `
    -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
}

function Test-Port($p) {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $p); return $true } catch { return $false } finally { $c.Close() }
}

# Laeuft noch ein Server mit altem Stand (z. B. von vor einem Update), wird er beendet
if (Test-Port $port) {
  $want = (& node server/version.js).Trim()
  $have = $null
  try { $have = (Invoke-RestMethod -UseBasicParsing -TimeoutSec 3 "http://127.0.0.1:$port/api/version").version } catch {}
  if ($have -ne $want) {
    Write-Host 'Alter Server mit veraltetem Stand gefunden, starte ihn neu ...'
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
  }
}

$server = $null
if (Test-Port $port) {
  Write-Host "Server laeuft schon auf Port $port, nutze ihn."
} else {
  Write-Host 'Starte Spielserver ...'
  $server = Start-Process -FilePath 'node' -ArgumentList '--no-warnings', 'server/index.js' -NoNewWindow -PassThru
}

# Traegt die aktuelle Tunnel-Adresse in die versteckte Seite auf Ru-Services ein,
# damit das Spiel immer unter derselben Adresse erreichbar ist (siehe README).
$siteSlug = 'r5ec5sacle6b'
$siteUrl = "https://finnru007.github.io/Ru-Services/$siteSlug/"
function Publish-Adresse($tunnelUrl) {
  $site = Join-Path (Split-Path -Parent $root) 'Ru-Services'
  try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git fehlt' }
    if (-not (Test-Path (Join-Path $site '.git'))) {
      & git clone -q https://github.com/FinnRu007/Ru-Services.git $site 2>&1 | Out-Null
    }
    & git -C $site pull -q --rebase 2>&1 | Out-Null
    $json = @{ url = $tunnelUrl; seit = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText((Join-Path $site "$siteSlug\adresse.json"), $json)
    & git -C $site add "$siteSlug/adresse.json" 2>&1 | Out-Null
    & git -C $site -c user.name=FinnRu007 -c user.email=208017591+FinnRu007@users.noreply.github.com commit -q -m 'Spieladresse aktualisiert' 2>&1 | Out-Null
    & git -C $site push -q 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'push fehlgeschlagen' }
    Write-Host "  Feste Adresse (in etwa einer Minute aktuell): $siteUrl" -ForegroundColor Green
  } catch {
    Write-Host "  Feste Adresse konnte nicht aktualisiert werden ($_). Die Adresse oben geht trotzdem." -ForegroundColor DarkYellow
  }
}

$log = Join-Path $tools 'tunnel.log'
$logOut = Join-Path $tools 'tunnel.out.log'
Remove-Item $log, $logOut -ErrorAction SilentlyContinue
Write-Host 'Oeffne Tunnel ins Internet ...'
$tunnel = Start-Process -FilePath $cf -NoNewWindow -PassThru `
  -ArgumentList 'tunnel', '--no-autoupdate', '--url', "http://localhost:$port" `
  -RedirectStandardError $log -RedirectStandardOutput $logOut

$url = $null
for ($i = 0; $i -lt 90 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if ($tunnel.HasExited) { break }
  foreach ($f in @($log, $logOut)) {
    if (Test-Path $f) {
      $m = Select-String -Path $f -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches |
        ForEach-Object { $_.Matches } | Where-Object { $_.Value -ne 'https://api.trycloudflare.com' } | Select-Object -First 1
      if ($m) { $url = $m.Value }
    }
  }
}

try {
  if (-not $url) {
    Write-Host ''
    Write-Host 'Der Tunnel konnte nicht geoeffnet werden. Details in tools\tunnel.log' -ForegroundColor Red
    Write-Host 'Lokal und im WLAN laeuft das Spiel trotzdem: http://localhost:3000'
  } else {
    Set-Content -Path (Join-Path $root 'Online-Adresse.txt') -Value $url -Encoding ASCII
    try { Set-Clipboard -Value $url } catch {}
    Write-Host ''
    Write-Host '=============================================================' -ForegroundColor Yellow
    Write-Host '  ONLINE! Diese Adresse an Freunde schicken:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host "  $url" -ForegroundColor Green
    Write-Host ''
    Write-Host '  (steht schon in der Zwischenablage und in Online-Adresse.txt)'
    Write-Host '  Fenster offen lassen, solange gespielt wird.'
    Write-Host '=============================================================' -ForegroundColor Yellow
    Write-Host ''
    Publish-Adresse $url
    Start-Process "http://localhost:$port"
  }
  if ($server) { Wait-Process -Id $server.Id } else { Wait-Process -Id $tunnel.Id }
} finally {
  if (-not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue }
}
