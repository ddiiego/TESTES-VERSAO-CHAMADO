# Script para Rodar o Sistema (Backend + Frontend)
Write-Host "Verificando Java..." -ForegroundColor Cyan
if (!(Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Java (JDK 17) nÃ£o encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale o JDK 17 para rodar o Backend."
    exit
}

Write-Host "Iniciando Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\mvnw.cmd spring-boot:run"

Write-Host "Iniciando Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Sistema em inicializaÃ§Ã£o! Aguarde alguns segundos." -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend API: http://localhost:8080"
