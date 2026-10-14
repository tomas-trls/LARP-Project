# Saves your Anthropic API key into .env without showing it on screen.
#
# How to use (from the project folder, in a PowerShell terminal):
#     powershell -ExecutionPolicy Bypass -File .\set-api-key.ps1
# Then paste your key when asked (nothing appears as you paste; that is normal) and press Enter.
#
# The script only changes the ANTHROPIC_API_KEY line. Every other line in .env stays as it is.
# It never prints the key, only how long it is.

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Could not find .env in $PSScriptRoot. Copy .env.example to .env first." -ForegroundColor Red
    exit 1
}

# Ask for the key as a "secure string" so it is not echoed to the screen.
$secure = Read-Host "Paste your Anthropic API key (hidden), then press Enter" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim().Trim('"').Trim("'") }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }

if (-not $key.StartsWith("sk-ant-")) {
    Write-Host "That does not look like an Anthropic key (they start with sk-ant-). Nothing was saved." -ForegroundColor Red
    exit 1
}
if ($key -match "\s") {
    Write-Host "The key contains spaces or line breaks. Copy it again with the Copy button. Nothing was saved." -ForegroundColor Red
    exit 1
}

# Replace just the one line, keeping the file's other lines exactly as they are.
$lines = [IO.File]::ReadAllLines($envFile)
$found = $false
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "^ANTHROPIC_API_KEY=") { $lines[$i] = "ANTHROPIC_API_KEY=$key"; $found = $true }
}
if (-not $found) { $lines += "ANTHROPIC_API_KEY=$key" }
[IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding($false)))

# Read it back to confirm, still without printing it.
$saved = ([IO.File]::ReadAllLines($envFile) | Where-Object { $_ -match "^ANTHROPIC_API_KEY=" }).Substring("ANTHROPIC_API_KEY=".Length)
Write-Host "Saved. The key in .env is now $($saved.Length) characters long and starts with sk-ant-." -ForegroundColor Green
Write-Host "(DEMO_MODE is still on, so nothing will use the key until you switch it off.)"
