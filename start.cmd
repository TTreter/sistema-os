@echo off
title Sistema de Gestao - Oficina Mecanica
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   Sistema de Gestao para Oficina Mecanica - v1.0.0      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Verificando dependencias...
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo.
    echo Instalando dependencias pela primeira vez...
    echo Isso pode levar alguns minutos...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas com sucesso!
)

REM Verificar se o banco de dados existe
if not exist "database\oficina.db" (
    echo.
    echo Inicializando banco de dados...
    call npm run init-db
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao inicializar banco de dados!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Banco de dados inicializado!
)

echo.
echo ════════════════════════════════════════════════════════════
echo Iniciando servidor...
echo ════════════════════════════════════════════════════════════
echo.
echo Aguarde alguns segundos ate o servidor iniciar completamente
echo.
echo Apos a inicializacao, acesse no navegador:
echo   - http://localhost:3000
echo   - http://SEU_IP_LOCAL:3000
echo.
echo Para parar o servidor, pressione CTRL+C
echo.
echo ════════════════════════════════════════════════════════════
echo.

REM Iniciar o servidor
node server.js

REM Se o servidor parar, aguardar antes de fechar
echo.
echo.
echo Servidor encerrado.
pause
