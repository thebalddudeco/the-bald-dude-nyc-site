param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Output,

    [string]$RepoId = 'TheBaldDudeCo/website-gallery',

    [int]$MaxLongEdge = 2200,

    [int]$Quality = 86,

    [int]$Workers = 6
)

$ErrorActionPreference = 'Stop'

function ConvertTo-Slug {
    param([Parameter(Mandatory = $true)][string]$Value)

    $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
    $ascii = -join ($normalized.ToCharArray() | Where-Object {
        [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne
            [Globalization.UnicodeCategory]::NonSpacingMark
    })

    $slug = $ascii.ToLowerInvariant()
    $slug = $slug -replace '&', '-and-'
    $slug = $slug -replace '[^a-z0-9]+', '-'
    return $slug.Trim('-')
}

function Get-Url {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    return "https://huggingface.co/datasets/$RepoId/resolve/main/$($RelativePath -replace '\\', '/')"
}

$sourceRoot = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\')
$outputRoot = [IO.Path]::GetFullPath($Output).TrimEnd('\')
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source

if (Test-Path -LiteralPath $outputRoot) {
    throw "Output already exists: $outputRoot"
}

New-Item -ItemType Directory -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outputRoot 'media') | Out-Null

Add-Type -AssemblyName System.Drawing

$sourceFiles = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
    Where-Object { $_.Extension.ToLowerInvariant() -in '.jpg', '.jpeg', '.mp4' } |
    Sort-Object FullName

$planned = foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($sourceRoot.Length + 1)
    $relativeDirectory = Split-Path -Parent $relative
    $segments = $relativeDirectory -split '\\'
    $albumId = (($segments | ForEach-Object { ConvertTo-Slug $_ }) -join '--')
    $albumName = $segments -join ' — '
    $baseName = ConvertTo-Slug ([IO.Path]::GetFileNameWithoutExtension($file.Name))
    $isVideo = $file.Extension.ToLowerInvariant() -eq '.mp4'
    $extension = if ($isVideo) { '.mp4' } else { '.webp' }
    $mediaRelative = "media/$albumId/$baseName$extension"
    $destination = Join-Path $outputRoot ($mediaRelative -replace '/', '\')

    $width = $null
    $height = $null
    if (-not $isVideo) {
        $image = [System.Drawing.Image]::FromFile($file.FullName)
        try {
            $width = $image.Width
            $height = $image.Height
        }
        finally {
            $image.Dispose()
        }
    }

    [pscustomobject]@{
        Source = $file.FullName
        SourceRelative = $relative -replace '\\', '/'
        AlbumId = $albumId
        AlbumName = $albumName
        Name = $file.Name
        Type = if ($isVideo) { 'video' } else { 'image' }
        Destination = $destination
        MediaRelative = $mediaRelative
        Width = $width
        Height = $height
    }
}

$collisions = $planned | Group-Object MediaRelative | Where-Object Count -gt 1
if ($collisions) {
    $paths = $collisions | ForEach-Object { $_.Name }
    throw "Output path collisions detected: $($paths -join ', ')"
}

$imageJobs = $planned | Where-Object Type -eq 'image'
$imageJobs | ForEach-Object -Parallel {
    $job = $_
    $parent = Split-Path -Parent $job.Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null

    $filter = "scale='if(gte(iw,ih),min($using:MaxLongEdge,iw),-2)':'if(gte(iw,ih),-2,min($using:MaxLongEdge,ih))'"
    & $using:ffmpeg -y -hide_banner -loglevel error -i $job.Source -vf $filter `
        -c:v libwebp -quality $using:Quality -compression_level 4 -preset picture `
        $job.Destination

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $job.Destination)) {
        throw "Image conversion failed: $($job.Source)"
    }
} -ThrottleLimit $Workers

$videoJobs = $planned | Where-Object Type -eq 'video'
foreach ($job in $videoJobs) {
    $parent = Split-Path -Parent $job.Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $job.Source -Destination $job.Destination
}

$albums = foreach ($group in ($planned | Group-Object AlbumId | Sort-Object Name)) {
    $first = $group.Group | Select-Object -First 1
    $items = foreach ($item in $group.Group) {
        $published = Get-Item -LiteralPath $item.Destination
        [ordered]@{
            id = "$($item.AlbumId)--$(ConvertTo-Slug ([IO.Path]::GetFileNameWithoutExtension($item.Name)))"
            type = $item.Type
            name = $item.Name
            path = $item.MediaRelative
            url = Get-Url $item.MediaRelative
            width = $item.Width
            height = $item.Height
            bytes = $published.Length
        }
    }

    $cover = $items | Where-Object type -eq 'image' | Select-Object -First 1
    [ordered]@{
        id = $first.AlbumId
        name = $first.AlbumName
        count = $items.Count
        cover = $cover.url
        items = @($items)
    }
}

$manifest = [ordered]@{
    version = 1
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    repository = "https://huggingface.co/datasets/$RepoId"
    baseUrl = "https://huggingface.co/datasets/$RepoId/resolve/main"
    albumCount = $albums.Count
    itemCount = $planned.Count
    albums = @($albums)
}

$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $outputRoot 'archive.json') -Encoding utf8

$checksums = Get-ChildItem -LiteralPath (Join-Path $outputRoot 'media') -Recurse -File |
    Sort-Object FullName |
    ForEach-Object {
        [ordered]@{
            path = $_.FullName.Substring($outputRoot.Length + 1) -replace '\\', '/'
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            bytes = $_.Length
        }
    }

$checksums | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputRoot 'checksums.json') -Encoding utf8

$readme = @"
---
license: other
pretty_name: The Bald Dude Co. Website Gallery
---

# The Bald Dude Co. Website Gallery

Web-ready portfolio media for The Bald Dude Co. The album structure and public file URLs are published in `archive.json` for use by the official website.

Copyright The Bald Dude Co. All rights reserved. These files are not licensed for redistribution, resale, dataset compilation, or model training.
"@
$readme | Set-Content -LiteralPath (Join-Path $outputRoot 'README.md') -Encoding utf8

$publishedFiles = Get-ChildItem -LiteralPath $outputRoot -Recurse -File
[pscustomobject]@{
    Albums = $albums.Count
    Items = $planned.Count
    Images = $imageJobs.Count
    Videos = $videoJobs.Count
    PublishedFiles = $publishedFiles.Count
    PublishedBytes = ($publishedFiles | Measure-Object Length -Sum).Sum
    Output = $outputRoot
} | ConvertTo-Json
