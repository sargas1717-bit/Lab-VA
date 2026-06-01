#!/usr/bin/env bash

# SPDX-License-Identifier: Apache-2.0
# ==============================================================================
# SCRIPT INICIALIZADOR DEL LABORATORIO EN LINUX / MACOS
# ==============================================================================
# Este script automatiza la comprobación de dependencias del entorno,
# la instalación de módulos Node.js y arranca el servidor local de desarrollo.
# ==============================================================================

# Colores para salida en terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;32m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}      INICIANDO: LABORATORIO DE VISIÓN ARTIFICIAL E INTERACCIÓN       ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Comprobar si Node.js está disponible en el comando global
if ! command -v node &> /dev/null
then
    echo -e "${RED}[ERROR] Node.js no está instalado o no se encuentra en el PATH del sistema.${NC}"
    echo -e "Por favor, descarga Node.js en https://nodejs.org/ e inténtalo de nuevo."
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[OK] Node.js detectado: ${NODE_VERSION}${NC}"
fi

# 2. Comprobar si npm está disponible
if ! command -v npm &> /dev/null
then
    echo -e "${RED}[ERROR] npm no está instalado o no se encuentra en el PATH del sistema.${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}[OK] npm detectado: ${NPM_VERSION}${NC}"
fi

# 3. Validar existencia del paquete maestro de configuración
if [ ! -f "package.json" ]; then
    echo -e "${RED}[ERROR] No se encuentra el archivo package.json en la ruta actual.${NC}"
    echo "Asegúrate de ejecutar este script desde el directorio raíz del proyecto."
    exit 1
fi

# 4. Instalar o comprobar el directorio node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Directorio 'node_modules' no detectado. Descargando dependencias...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Dependencias instaladas con éxito utilizando npm install.${NC}"
    else
        echo -e "${RED}[ERROR] Ocurrió un error al instalar los paquetes de dependencias.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[OK] Directorio de dependencias 'node_modules' existente.${NC}"
fi

# 5. Arrancar el servidor de desarrollo Vite con puerto e IP fijos
echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   SERVIDOR RECONOCIMIENTO LISTO: http://localhost:3000 o 0.0.0.0      ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}Abriendo tunel local y ejecutando compilador reactivo en vivo...${NC}"
echo ""

# Iniciar el servidor local
npm run dev
