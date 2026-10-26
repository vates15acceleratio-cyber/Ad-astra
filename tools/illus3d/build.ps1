# Pipeline d'illustration : poses -> rendu Blender -> finition PhotoCraft (WebP) -> img/exo -> registre.
# Usage : powershell -File tools/illus3d/build.ps1 dos-tractions[,autre-id] [-Size 768] [-Samples 128] [-Style astro|robot|human]
param([Parameter(Mandatory=$true)][string]$Ids, [int]$Size = 768, [int]$Samples = 128, [string]$Style = 'astro')
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$work = Join-Path $env:TEMP 'adastra-illus3d'
New-Item -ItemType Directory -Force $work | Out-Null
$blender = Get-ChildItem 'C:\Program Files\Blender Foundation\Blender *\blender.exe' | Sort-Object FullName -Descending | Select-Object -First 1
$pc = 'C:\Program Files\PhotoCraft\photocraft-cli.exe'
node (Join-Path $root 'tools\illus3d\export-poses.js') $Ids (Join-Path $work 'poses.json')
& $blender.FullName -b -P (Join-Path $root 'tools\illus3d\render.py') -- (Join-Path $work 'poses.json') (Join-Path $work 'png') $Size $Samples $Style | Select-String 'Saved'
New-Item -ItemType Directory -Force (Join-Path $root 'img\exo') | Out-Null
Get-ChildItem (Join-Path $work 'png') -Filter *.png | ForEach-Object {
  $out = Join-Path $root ('img\exo\' + $_.BaseName + '.webp')
  & $pc convert $_.FullName $out --quality 84 2>$null
  "{0} -> {1} Ko" -f $_.Name, [math]::Round((Get-Item $out).Length / 1KB)
}
node (Join-Path $root 'tools\build-illus.js')
