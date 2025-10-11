# Quick Build Script for Windows
# Run this to rebuild the installers quickly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AJS Exam Browser - Quick Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Clean previous build
if (Test-Path "dist") {
    Write-Host "Cleaning previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "dist"
    Write-Host ""
}

# Build
Write-Host "Building Windows installers..." -ForegroundColor Green
npm run build-win

# Check if build succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output location: dist\" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Yellow
    Get-ChildItem -Path "dist" -Filter "*.exe" | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Ready to distribute!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Build failed! Check errors above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
