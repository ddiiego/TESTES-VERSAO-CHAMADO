@echo off
echo ==========================================
echo    INICIANDO SISTEMA DE CHAMADOS
echo ==========================================
echo.
echo 1. Iniciando o Backend (Node.js Express)...
start cmd /k "cd backend && npm start"
echo.
echo 2. Iniciando o Frontend (React Vite)...
start cmd /k "cd frontend && npm run dev"
echo.
set "IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "tempIP=%%a"
    set "tempIP=!tempIP: =!"
    if "!IP!"=="localhost" if not "!tempIP!"=="127.0.0.1" set "IP=!tempIP!"
)

echo.
echo ==========================================
echo    O sistema estara disponivel em breve!
echo    Frontend (PC): http://localhost:5173
echo    Acesso na Rede: http://%IP%:5173
echo ==========================================
pause
