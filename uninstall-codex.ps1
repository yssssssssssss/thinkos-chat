# 创建一个纯英文脚本
$englishScript = @'
# Run PowerShell as Administrator
Write-Host "=== Uninstalling Codex ===" -ForegroundColor Cyan

# 1. Stop all related processes
Write-Host "Stopping processes..." -ForegroundColor Yellow
Get-Process | Where-Object { 
    $_.ProcessName -like "*codex*" -or 
    $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*codex*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# 2. Uninstall via npm
Write-Host "Uninstalling via npm..." -ForegroundColor Yellow
npm uninstall -g @openai/codex 2>$null
npm uninstall -g codex 2>$null
npm uninstall -g codex-cli 2>$null

# 3. Manually delete files and directories
Write-Host "Deleting files..." -ForegroundColor Yellow
$paths = @(
    # npm global installation directory
    "$env:APPDATA\npm\node_modules\@openai\codex",
    "$env:APPDATA\npm\node_modules\@openai\.codex-*",
    "$env:APPDATA\npm\codex*",
    "$env:APPDATA\npm\codex.cmd",
    
    # User data directories
    "$env:USERPROFILE\.codex",
    "$env:APPDATA\Codex",
    "$env:LOCALAPPDATA\Codex",
    
    # Temporary files
    "$env:TEMP\.codex-*",
    "$env:TEMP\codex-*",
    
    # Possible cache files
    "$env:LOCALAPPDATA\Temp\codex*"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "Deleted: $path" -ForegroundColor Green
        } catch {
            Write-Host "Cannot delete: $path" -ForegroundColor Red
            Write-Host "Error: $_" -ForegroundColor DarkYellow
        }
    }
}

# 4. Clean npm cache
Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "`n=== Uninstall Complete ===" -ForegroundColor Green
Write-Host "Recommend restarting computer" -ForegroundColor Cyan
'@

# Save file
$englishScript | Out-File -FilePath ".\uninstall-codex-en.ps1" -Encoding UTF8

# Run
Set-ExecutionPolicy -Scope Process Bypass
.\uninstall-codex-en.ps1