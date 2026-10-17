param(
    [string]$ProtocolUrl,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$protocolKey = 'HKCU:\Software\Classes\streamapp-player'
$installDirectory = Join-Path $env:LOCALAPPDATA 'StreamApp\PlayerBridge'
$installedScript = Join-Path $installDirectory 'streamapp-player-bridge.ps1'

function Find-VlcExecutable {
    $candidates = @()
    $registryLocations = @(
        'HKLM:\SOFTWARE\VideoLAN\VLC',
        'HKLM:\SOFTWARE\WOW6432Node\VideoLAN\VLC',
        'HKCU:\SOFTWARE\VideoLAN\VLC'
    )

    foreach ($location in $registryLocations) {
        $installPath = (Get-ItemProperty -LiteralPath $location -Name InstallDir -ErrorAction SilentlyContinue).InstallDir
        if ($installPath) {
            $candidates += Join-Path $installPath 'vlc.exe'
        }
    }

    $appPathLocations = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe'
    )
    foreach ($location in $appPathLocations) {
        $entry = Get-Item -LiteralPath $location -ErrorAction SilentlyContinue
        if ($entry) {
            $candidates += $entry.GetValue('')
        }
    }

    $programFiles = [Environment]::GetFolderPath('ProgramFiles')
    $programFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86')
    $localPrograms = Join-Path $env:LOCALAPPDATA 'Programs'
    $candidates += @(
        (Join-Path $programFiles 'VideoLAN\VLC\vlc.exe'),
        (Join-Path $programFilesX86 'VideoLAN\VLC\vlc.exe'),
        (Join-Path $localPrograms 'VideoLAN\VLC\vlc.exe')
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return $candidate
        }
    }
    return $null
}

function Show-BridgeError([string]$Message) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [void][System.Windows.Forms.MessageBox]::Show(
            $Message,
            'SVHome VLC Player',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning)
    } catch {
        Write-Error $Message
    }
}

function Quote-ProcessArgument([string]$Value) {
    $builder = [System.Text.StringBuilder]::new()
    [void]$builder.Append('"')
    $backslashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $backslashes++
            continue
        }
        if ($character -eq '"') {
            [void]$builder.Append(('\' * (2 * $backslashes + 1))).Append('"')
            $backslashes = 0
            continue
        }
        if ($backslashes -gt 0) {
            [void]$builder.Append(('\' * $backslashes))
            $backslashes = 0
        }
        [void]$builder.Append($character)
    }
    if ($backslashes -gt 0) {
        [void]$builder.Append(('\' * (2 * $backslashes)))
    }
    [void]$builder.Append('"')
    return $builder.ToString()
}

if ($Uninstall) {
    Remove-Item -LiteralPath $protocolKey -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $installDirectory -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'Se quitó el puente de VLC de este usuario.'
    exit 0
}

if ($ProtocolUrl) {
    try {
        Add-Type -AssemblyName System.Web
        $request = [Uri]$ProtocolUrl
        if ($request.Scheme -ne 'streamapp-player' -or $request.Host -ne 'play') {
            throw 'El enlace no corresponde al protocolo de SVHome.'
        }

        $streamUrl = [System.Web.HttpUtility]::ParseQueryString($request.Query).Get('url')
        $title = [System.Web.HttpUtility]::ParseQueryString($request.Query).Get('title')
        $stream = [Uri]$streamUrl
        if ($stream.Scheme -notin @('http', 'https') -or $stream.AbsolutePath -notmatch '^/api/stream/[^/]+$') {
            throw 'El enlace no es una URL de streaming válida de SVHome.'
        }

        $vlc = Find-VlcExecutable
        if (-not $vlc) {
            throw 'No se encontró VLC. Instala VLC y vuelve a intentarlo.'
        }

        if ([string]::IsNullOrWhiteSpace($title)) {
            $title = 'SVHome'
        }
        $arguments = @("--meta-title=$title", $stream.AbsoluteUri) |
            ForEach-Object { Quote-ProcessArgument $_ }
        Start-Process -FilePath $vlc -ArgumentList ($arguments -join ' ')
    } catch {
        Show-BridgeError $_.Exception.Message
    }
    exit 0
}

$vlc = Find-VlcExecutable
if (-not $vlc) {
    Write-Warning 'No se encontró VLC en las ubicaciones habituales. Se instalará el protocolo, pero VLC debe estar instalado antes de reproducir.'
}

New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination $installedScript -Force

$powershell = Join-Path $PSHOME 'powershell.exe'
$command = '"{0}" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{1}" "%1"' -f $powershell, $installedScript
New-Item -Path $protocolKey -Force | Out-Null
Set-Item -LiteralPath $protocolKey -Value 'URL: SVHome VLC Player'
New-ItemProperty -LiteralPath $protocolKey -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$commandKey = Join-Path $protocolKey 'shell\open\command'
New-Item -Path $commandKey -Force | Out-Null
Set-Item -LiteralPath $commandKey -Value $command

Write-Host 'Puente de VLC instalado para este usuario. Ya puedes volver a SVHome y pulsar Reproducir en VLC.'