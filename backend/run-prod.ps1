param(
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [string]$Profile = "prod",
    [string[]]$JvmArgs,
    [string]$DatasourceUrl,
    [string]$DatasourceUsername,
    [string]$DatasourcePassword,
    [string]$DatasourceDriver,
    [string]$JwtSecret,
    [string]$CorsAllowedOrigins,
    [string]$ConfigFile = ".env.prod.local"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Host "=== Restaurant Backend (prod) ===" -ForegroundColor Cyan

# Always execute from the backend directory so relative paths resolve correctly.
Set-Location -Path $PSScriptRoot

function Import-EnvFile {
    param([string]$Path)

    Write-Host "Loading configuration from $Path" -ForegroundColor Yellow
    $result = @{}
    foreach ($rawLine in Get-Content -Path $Path) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line.StartsWith("#")) { continue }

        $parts = $line -split '=', 2
        if ($parts.Count -ne 2) { continue }

        $key = $parts[0].Trim()
        if ([string]::IsNullOrWhiteSpace($key)) { continue }

        $value = $parts[1].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            if ($value.Length -ge 2) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        $result[$key] = $value
    }
    return $result
}

function Apply-EnvironmentValues {
    param([hashtable]$Values)

    $backup = @{}
    foreach ($entry in $Values.GetEnumerator()) {
        $key = $entry.Key
        $newValue = $entry.Value
        $existing = $null
        if (Test-Path "Env:$key") {
            $existing = (Get-Item "Env:$key").Value
        }
        $backup[$key] = $existing
        Set-Item -Path "Env:$key" -Value $newValue
    }
    return $backup
}

function Restore-EnvironmentValues {
    param([hashtable]$Backup)

    foreach ($entry in $Backup.GetEnumerator()) {
        $key = $entry.Key
        $value = $entry.Value
        if ($null -eq $value) {
            Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path "Env:$key" -Value $value
        }
    }
}

$runtimeEnv = @{}
if ($ConfigFile) {
    $configPath = $ConfigFile
    if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) {
        $configPath = Join-Path -Path $PSScriptRoot -ChildPath $ConfigFile
    }

    if (Test-Path -Path $configPath) {
        $fileValues = Import-EnvFile -Path $configPath
        foreach ($entry in $fileValues.GetEnumerator()) {
            $runtimeEnv[$entry.Key] = $entry.Value
        }
    } else {
        Write-Host "Config file '$configPath' not found. Skipping auto configuration." -ForegroundColor DarkYellow
    }
}

if (-not $SkipBuild) {
    Write-Host "Building backend with Maven wrapper..." -ForegroundColor Yellow
    $mavenArgs = @("-q", "clean", "package")
    if ($SkipTests) {
        Write-Host "Tests disabled for this build run." -ForegroundColor DarkYellow
        $mavenArgs += "-DskipTests"
    }
    & .\mvnw.cmd @mavenArgs
    Write-Host "Build completed." -ForegroundColor Green
} else {
    Write-Host "Skipping build step (per --SkipBuild)." -ForegroundColor Yellow
}

$targetDir = Join-Path -Path $PSScriptRoot -ChildPath "target"
if (-not (Test-Path -Path $targetDir)) {
    throw "Build output folder '$targetDir' not found. Run without -SkipBuild to create it."
}

$artifact = Get-ChildItem -Path (Join-Path $targetDir "*.jar") | Sort-Object LastWriteTime | Select-Object -Last 1
if (-not $artifact) {
    throw "No JAR artifact found in '$targetDir'. Ensure the build completed successfully."
}

function Set-RuntimeEnvValue {
    param(
        [string]$Key,
        [string]$Value
    )
    if ([string]::IsNullOrWhiteSpace($Key)) { return }
    if ($null -eq $Value) {
        $runtimeEnv.Remove($Key) | Out-Null
    } else {
        $runtimeEnv[$Key] = $Value
    }
}

if (-not $env:SPRING_PROFILES_ACTIVE -and $Profile) {
    Write-Host "Setting SPRING_PROFILES_ACTIVE=$Profile" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "SPRING_PROFILES_ACTIVE" -Value $Profile
}

if ($DatasourceUrl) {
    Write-Host "Setting SPRING_DATASOURCE_URL from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "SPRING_DATASOURCE_URL" -Value $DatasourceUrl
}

if ($DatasourceUsername) {
    Write-Host "Setting SPRING_DATASOURCE_USERNAME from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "SPRING_DATASOURCE_USERNAME" -Value $DatasourceUsername
}

if ($DatasourcePassword) {
    Write-Host "Setting SPRING_DATASOURCE_PASSWORD from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "SPRING_DATASOURCE_PASSWORD" -Value $DatasourcePassword
}

if ($DatasourceDriver) {
    Write-Host "Setting SPRING_DATASOURCE_DRIVER from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "SPRING_DATASOURCE_DRIVER" -Value $DatasourceDriver
}

if ($JwtSecret) {
    Write-Host "Setting APP_JWT_SECRET from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "APP_JWT_SECRET" -Value $JwtSecret
}

if ($CorsAllowedOrigins) {
    Write-Host "Setting APP_CORS_ALLOWED_ORIGINS from parameter" -ForegroundColor Yellow
    Set-RuntimeEnvValue -Key "APP_CORS_ALLOWED_ORIGINS" -Value $CorsAllowedOrigins
}

$javaCmd = "java"
Write-Host "Starting JAR: $($artifact.Name)" -ForegroundColor Cyan

$javaArguments = @("-jar", $artifact.FullName)
if ($JvmArgs) {
    $javaArguments = $JvmArgs + $javaArguments
}

if ($runtimeEnv.Count -gt 0) {
    $envBackup = Apply-EnvironmentValues -Values $runtimeEnv
    try {
        & $javaCmd @javaArguments
    } finally {
        Restore-EnvironmentValues -Backup $envBackup
    }
} else {
    & $javaCmd @javaArguments
}

exit $LASTEXITCODE
