#!/bin/bash

# Script de inicialização para Linux/macOS
# Sistema de Gestão para Oficina Mecânica

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Sistema de Gestão para Oficina Mecânica - v1.0.0      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Verificando dependências..."
echo ""

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Por favor, instale o Node.js em: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[OK] Node.js encontrado"
node --version

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Instalando dependências pela primeira vez..."
    echo "Isso pode levar alguns minutos..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERRO] Falha ao instalar dependências!"
        exit 1
    fi
    echo ""
    echo "[OK] Dependências instaladas com sucesso!"
fi

# Verificar se o banco de dados existe
if [ ! -f "database/oficina.db" ]; then
    echo ""
    echo "Inicializando banco de dados..."
    npm run init-db
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERRO] Falha ao inicializar banco de dados!"
        exit 1
    fi
    echo ""
    echo "[OK] Banco de dados inicializado!"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Iniciando servidor..."
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Aguarde alguns segundos até o servidor iniciar completamente"
echo ""
echo "Após a inicialização, acesse no navegador:"
echo "  - http://localhost:3000"
echo "  - http://SEU_IP_LOCAL:3000"
echo ""
echo "Para parar o servidor, pressione CTRL+C"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Iniciar o servidor
node server.js
