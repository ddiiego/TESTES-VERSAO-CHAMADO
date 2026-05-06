@echo off
setlocal enabledelayedexpansion

:: Verificar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ==================================================
    echo    [ERRO] ACESSO NEGADO
    echo ==================================================
    echo Este script precisa de privilegios de ADMINISTRADOR.
    echo.
    echo 1. Clique com o botao direito neste arquivo (CONFIGURAR_REDE.bat)
    echo 2. Escolha "Executar como Administrador"
    echo ==================================================
    echo.
    pause
    exit /b
)

echo ==================================================
echo    CONFIGURADOR DE REDE - SISTEMA DE CHAMADOS
echo ==================================================
echo.
echo Este script fara duas coisas:
echo 1. Identificara seu IP na rede local.
echo 2. Abrira as portas 5173 (Frontend) e 8080 (Backend).
echo.

:: Detectar IP Local (IPv4) - Metodo robusto para Windows em PT/EN
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "tempIP=%%a"
    set "tempIP=!tempIP: =!"
    :: Pega o primeiro IP que nao seja 127.0.0.1 ou vazio
    if "!IP!"=="" (
        if not "!tempIP!"=="127.0.0.1" set "IP=!tempIP!"
    )
)

if "%IP%"=="" (
    echo [ERRO] Nao foi possivel detectar seu IP. 
    echo Verifique se voce esta conectado ao Wi-Fi ou Cabo.
    pause
    exit /b
)

echo [OK] Seu IP de Rede Local: %IP%
echo.

:: Abrir Portas no Firewall (Remove regras antigas se existirem para evitar duplicatas)
echo [CONFIG] Configurando Firewall...
netsh advfirewall firewall delete rule name="Sistema Chamados - Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="Sistema Chamados - Backend" >nul 2>&1

netsh advfirewall firewall add rule name="Sistema Chamados - Frontend" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Sistema Chamados - Backend" dir=in action=allow protocol=TCP localport=8080

echo.
echo ==================================================
echo             TUDO PRONTO PARA TESTAR!
echo ==================================================
echo.
echo Digite estes enderecos no seu CELULAR:
echo.
echo 1. URL Principal (FRONTEND):
echo    http://%IP%:5173
echo.
echo 2. Se o site abrir mas o login falhar, verifique se:
echo    http://%IP%:8080/api/status (deve aparecer OK no celular)
echo.
echo DICA: Use o CHROME ou SAFARI do celular para o primeiro teste.
echo O navegador do Telegram pode ser mais chato com caches.
echo ==================================================
echo.
pause
