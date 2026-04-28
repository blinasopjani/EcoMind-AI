# EcoMind AI+ Backend Installer
Write-Host "Duke instaluar paketat e nevojshme për Backend-in..." -ForegroundColor Cyan

if (!(Test-Path "backend")) {
    Write-Host "Error: Folderi 'backend' nuk u gjet!" -ForegroundColor Red
    exit
}

cd backend

# Kontrollimi i Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python nuk u gjet! Ju lutem instaloni Python nga python.org" -ForegroundColor Yellow
} else {
    Write-Host "Duke instaluar varësitë nga requirements.txt..." -ForegroundColor Green
    pip install -r requirements.txt
    Write-Host "Instalimi u krye me sukses!" -ForegroundColor Green
    Write-Host "Për të nisur serverin, shkruani: uvicorn app.main:app --reload" -ForegroundColor Cyan
}

pause
