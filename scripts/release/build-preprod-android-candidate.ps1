#requires -Version 7.0

param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDecoded,
  [Parameter(Mandatory = $true)]
  [string]$WebRoot,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [Parameter(Mandatory = $true)]
  [int]$VersionCode,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedRuntimeApiOrigin,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedRuntimeAssetOrigin,
  [Parameter(Mandatory = $true)]
  [string]$KeystorePath,
  [Parameter(Mandatory = $true)]
  [string]$CertificateInfoPath,
  [Parameter(Mandatory = $true)]
  [string]$JavaPath,
  [Parameter(Mandatory = $true)]
  [string]$ApktoolJar,
  [Parameter(Mandatory = $true)]
  [string]$ZipalignPath,
  [Parameter(Mandatory = $true)]
  [string]$ApksignerJar
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ExistingPath([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label 不存在：$Path"
  }
  return (Resolve-Path -LiteralPath $Path).Path
}

function Read-SecretField([string[]]$Lines, [string]$Label) {
  $escaped = [Regex]::Escape($Label)
  $line = $Lines | Where-Object { $_ -match "^\s*$escaped\s*[:：]\s*(.+?)\s*$" } | Select-Object -First 1
  if (-not $line) {
    throw "私有证书资料缺少字段：$Label"
  }
  return ([Regex]::Match($line, "^\s*$escaped\s*[:：]\s*(.+?)\s*$")).Groups[1].Value
}

function Invoke-Checked([string]$Executable, [string[]]$Arguments, [string]$Label) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label 失败，退出码：$LASTEXITCODE"
  }
}

$sourceDecodedPath = Resolve-ExistingPath $SourceDecoded "APK 解包骨架"
$webRootPath = Resolve-ExistingPath $WebRoot "App 构建产物"
$keystoreResolved = Resolve-ExistingPath $KeystorePath "Android keystore"
$certInfoResolved = Resolve-ExistingPath $CertificateInfoPath "Android 私有证书资料"
$javaResolved = Resolve-ExistingPath $JavaPath "Java"
$apktoolResolved = Resolve-ExistingPath $ApktoolJar "apktool"
$zipalignResolved = Resolve-ExistingPath $ZipalignPath "zipalign"
$apksignerResolved = Resolve-ExistingPath $ApksignerJar "apksigner"

$runtimeBundlePath = Resolve-ExistingPath (Join-Path $webRootPath "app-service.js") "App 运行时主包"
$runtimeBundle = [IO.File]::ReadAllText($runtimeBundlePath)
if (-not $runtimeBundle.Contains($ExpectedRuntimeApiOrigin)) {
  throw "App 运行时主包未包含目标 API 域名，拒绝打包"
}
if (-not $runtimeBundle.Contains($ExpectedRuntimeAssetOrigin)) {
  throw "App 运行时主包未包含目标静态资源域名，拒绝打包"
}
if ($ExpectedRuntimeApiOrigin.Contains("pre-api.rebugx.cn")) {
  if ($runtimeBundle.Contains("https://api.rebugx.cn") -or $runtimeBundle.Contains("https://static.rebugx.cn")) {
    throw "预发布 App 运行时主包混入生产域名，拒绝打包"
  }
}

$outputFullPath = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $outputFullPath) {
  throw "输出目录已存在，为避免覆盖已停止：$outputFullPath"
}
New-Item -ItemType Directory -Path $outputFullPath | Out-Null

$decodedTarget = Join-Path $outputFullPath "decoded"
Copy-Item -LiteralPath $sourceDecodedPath -Destination $decodedTarget -Recurse

$wwwTarget = Join-Path $decodedTarget "assets\apps\__UNI__277B108\www"
$decodedPrefix = [IO.Path]::GetFullPath($decodedTarget).TrimEnd('\') + '\'
$wwwResolvedForCheck = [IO.Path]::GetFullPath($wwwTarget)
if (-not $wwwResolvedForCheck.StartsWith($decodedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "WWW 目标超出候选包解包目录，已停止：$wwwResolvedForCheck"
}
if (Test-Path -LiteralPath $wwwTarget) {
  Remove-Item -LiteralPath $wwwTarget -Recurse -Force
}
New-Item -ItemType Directory -Path $wwwTarget | Out-Null
Copy-Item -Path (Join-Path $webRootPath '*') -Destination $wwwTarget -Recurse -Force

$webManifestPath = Join-Path $wwwTarget "manifest.json"
$webManifest = Get-Content -Raw -LiteralPath $webManifestPath | ConvertFrom-Json
if ([int]$webManifest.version.code -ne $VersionCode) {
  throw "App 构建产物版本号为 $($webManifest.version.code)，与目标 $VersionCode 不一致"
}

$apktoolYamlPath = Join-Path $decodedTarget "apktool.yml"
$apktoolYaml = Get-Content -Raw -LiteralPath $apktoolYamlPath
$versionPattern = '(?m)^\s*versionCode:\s*\d+\s*$'
if ([Regex]::Matches($apktoolYaml, $versionPattern).Count -ne 1) {
  throw "apktool.yml 中 versionCode 数量异常"
}
$apktoolYaml = [Regex]::Replace($apktoolYaml, $versionPattern, "  versionCode: $VersionCode")
$apktoolYaml = [Regex]::Replace(
  $apktoolYaml,
  '(?m)^apkFileName:\s*.*$',
  "apkFileName: rebu-1.1.0-$VersionCode-preprod.apk"
)
[IO.File]::WriteAllText($apktoolYamlPath, $apktoolYaml, [Text.UTF8Encoding]::new($false))

$unsignedApk = Join-Path $outputFullPath "rebu-1.1.0-$VersionCode-preprod-unsigned.apk"
$alignedApk = Join-Path $outputFullPath "rebu-1.1.0-$VersionCode-preprod-aligned.apk"
$signedApk = Join-Path $outputFullPath "rebu-1.1.0-$VersionCode-preprod.apk"

Invoke-Checked $javaResolved @("-jar", $apktoolResolved, "b", $decodedTarget, "-o", $unsignedApk) "apktool 构建"
Invoke-Checked $zipalignResolved @("-f", "-p", "4", $unsignedApk, $alignedApk) "zipalign 对齐"

$privateLines = Get-Content -LiteralPath $certInfoResolved
$keyAlias = Read-SecretField $privateLines "别名"
$storePassword = Read-SecretField $privateLines "证书库密码"
$keyPassword = Read-SecretField $privateLines "证书私钥密码"

try {
  $env:REBU_ANDROID_STORE_PASSWORD = $storePassword
  $env:REBU_ANDROID_KEY_PASSWORD = $keyPassword
  Invoke-Checked $javaResolved @(
    "-jar", $apksignerResolved, "sign",
    "--ks", $keystoreResolved,
    "--ks-key-alias", $keyAlias,
    "--ks-pass", "env:REBU_ANDROID_STORE_PASSWORD",
    "--key-pass", "env:REBU_ANDROID_KEY_PASSWORD",
    "--v1-signing-enabled", "true",
    "--v2-signing-enabled", "true",
    "--out", $signedApk,
    $alignedApk
  ) "APK 签名"
} finally {
  Remove-Item Env:REBU_ANDROID_STORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:REBU_ANDROID_KEY_PASSWORD -ErrorAction SilentlyContinue
  $storePassword = $null
  $keyPassword = $null
}

Invoke-Checked $javaResolved @(
  "-jar", $apksignerResolved, "verify", "--verbose", "--print-certs", $signedApk
) "APK 签名验证"

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $signedApk).Hash
$size = (Get-Item -LiteralPath $signedApk).Length
Write-Output "candidate=$signedApk"
Write-Output "versionCode=$VersionCode"
Write-Output "sizeBytes=$size"
Write-Output "sha256=$hash"
