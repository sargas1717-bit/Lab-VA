@echo off
:: SPDX-License-Identifier: Apache-2.0
:: ==============================================================================
:: SCRIPT INICIALIZADOR DEL LABORATORIO EN WINDOWS (.bat)
:: ==============================================================================
:: Este script automatiza la comprobación de dependencias de Node.JS,
:: instala las bibliotecas locales y arranca el servidor Vite de desarrollo.
:: ==============================================================================

title Laboratorio de Vision Artificial e Interaccion - Inicializador
color 0B

echo ======================================================================
echo       INICIANDO: LABORATORIO DE VISION ARTIFICIAL E INTERACCION       
echo ======================================================================
echo.

:: 1. Comprobar si Node.JS está registrado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado o no se encuentra registrado en las Variable de Entorno (PATH^).
    echo Por favor, descarga Node.js desde https://nodejs.org/ e instalalo.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] Node.js detectado exitosamente: %NODE_VERSION%
)

:: 2. Comprobar si npm está registrado
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm no esta disponible en el PATH del sistema operativo.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo [OK] npm detectado exitosamente: %NPM_VERSION%
)

:: 3. Validar ruta actual
if not exist "package.json" (
    color 0C
    echo [ERROR] No se encuentra package.json en el directorio actual.
    echo Ejecuta este script .bat estando dentro de la carpeta raiz del proyecto.
    echo.
    pause
    exit /b 1
)

:: 4. Comprobar node_modules
if not exist "node_modules\" (
    echo [INFO] Directorio "node_modules" ausente. Instalando paquetes de dependencias...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Ocurrio un fallo durante el proceso de "npm install".
        echo.
        pause
        exit /b 1
    ) else (
        echo [OK] Módulos de desarrollo descargados con exito.
    )
) else (
    echo [OK] Carpeta "node_modules" registrada y lista para su uso.
)

echo.
echo ======================================================================
echo    SERVIDOR RECONOCIMIENTO FOTOGRAMETRICO: http://localhost:3000      
echo ======================================================================
echo Iniciando servidor en caliente de Vite...
echo.

call npm run dev
