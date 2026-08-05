#!/usr/bin/env bash
# ─── AI Store — Deploy Manual via SSH/cPanel ───
# Execute no servidor HostGator via cPanel Terminal ou SSH:
#   bash deploy-manual.sh
#
# Pré-requisitos:
#   - Acesso SSH ao HostGator (cPanel > Terminal)
#   - Node.js v20+ instalado (o script instala se necessário)

set -euo pipefail

HOME_DIR="${HOME:-/home1/luca2490}"
INSTALL_DIR="$HOME_DIR/aistore-api"
PUBLIC_HTML="$HOME_DIR/public_html"
STANDALONE_DIR="$INSTALL_DIR/standalone"
SERVER_PORT=18446
NODE_VERSION="v20.18.0"
NODE_DIR="$INSTALL_DIR/node-${NODE_VERSION}-linux-x64"
NODE_BIN="$NODE_DIR/bin/node"
PIDFILE="$INSTALL_DIR/server.pid"
LOGFILE="$INSTALL_DIR/server.log"

echo "========================================"
echo "  AI Store — Deploy Manual"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"

# ── 1. Instalar Node.js se necessário ──
if [ ! -f "$NODE_BIN" ]; then
    echo "[1/5] Instalando Node.js $NODE_VERSION..."
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    curl -sL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" -o node.tar.xz
    tar xf node.tar.xz
    rm node.tar.xz
    echo "  Node.js instalado em $NODE_DIR"
else
    echo "[1/5] Node.js já instalado em $NODE_DIR"
fi

# ── 2. Preparar diretórios ──
echo "[2/5] Preparando diretórios..."
mkdir -p "$STANDALONE_DIR"
mkdir -p "$INSTALL_DIR/db"

# ── 3. Extrair codebase se tarball existe ──
TARBALL="$PUBLIC_HTML/aistore-codebase.tar.gz"
if [ -f "$TARBALL" ]; then
    echo "[3/5] Extraindo codebase de $TARBALL..."
    rm -rf "${STANDALONE_DIR:?}/*"
    cd "$STANDALONE_DIR"
    tar xzf "$TARBALL"
    echo "  Codebase extraído ($(find . -type f | wc -l) arquivos)"
else
    echo "[3/5] Tarball não encontrado em $TARBALL"
    echo "  Execute o deploy via GitHub Actions primeiro para gerar o tarball."
    echo "  Ou faça upload manual do .next/standalone para $STANDALONE_DIR"
    if [ -f "$STANDALONE_DIR/server.js" ]; then
        echo "  Usando codebase existente em $STANDALONE_DIR"
    else
        echo "  ERRO: Nenhum codebase disponível. Abortando."
        exit 1
    fi
fi

# ── 4. Copiar DB para local persistente ──
echo "[4/5] Configurando banco de dados..."
SRC_DB="$STANDALONE_DIR/db/custom.db"
DST_DB="$INSTALL_DIR/db/custom.db"
if [ -f "$SRC_DB" ] && [ ! -f "$DST_DB" ]; then
    cp "$SRC_DB" "$DST_DB"
    echo "  DB copiado para $DST_DB"
elif [ -f "$DST_DB" ]; then
    echo "  DB já existe em $DST_DB ($(stat -c%s "$DST_DB" 2>/dev/null || echo '?') bytes)"
else
    echo "  AVISO: DB não encontrado. O servidor iniciará sem dados."
fi

# ── 5. Copiar CGI files para public_html ──
echo "[5/5] Configurando CGI..."
SCRIPT_SOURCE="$STANDALONE_DIR/../aistore-api.cgi"
if [ -f "$PUBLIC_HTML/aistore-api.cgi" ]; then
    echo "  CGI já existe em $PUBLIC_HTML/aistore-api.cgi"
else
    echo "  AVISO: aistore-api.cgi não encontrado em public_html."
    echo "  Upload manual necessário."
fi

# ── 6. Matar processo antigo se existir ──
if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "  Matando processo anterior (PID $OLD_PID)..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PIDFILE"
fi

# Matar orfãos na porta
fuser -k ${SERVER_PORT}/tcp 2>/dev/null || true

# ── 7. Iniciar servidor ──
echo ""
echo "Iniciando AI Store na porta $SERVER_PORT..."
cd "$STANDALONE_DIR"

export PATH="$NODE_DIR/bin:$PATH"
export PORT="$SERVER_PORT"
export HOSTNAME="127.0.0.1"
export NODE_ENV="production"
export NEXT_PUBLIC_BASE_PATH="/aistore"
export DATABASE_URL="file:$DST_DB"
export SESSION_SECRET="nexus-aistore-hg-prod-v1"
export BAITCOIN_SERVER_URL="http://127.0.0.1:18445"

nohup "$NODE_BIN" server.js > "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"

echo ""
echo "Servidor iniciado! PID: $(cat $PIDFILE)"
echo "Log: $LOGFILE"
echo "Aguardando servidor ficar pronto..."

# ── 8. Aguardar e testar ──
for i in $(seq 1 15); do
    sleep 2
    if curl -s --max-time 3 "http://127.0.0.1:${SERVER_PORT}/aistore/api/version" > /dev/null 2>&1; then
        echo "Servidor pronto em ~${i}0s!"
        curl -s "http://127.0.0.1:${SERVER_PORT}/aistore/api/version" | python3 -m json.tool 2>/dev/null || true
        echo ""
        echo "Teste: https://www.mybait.org/aistore/"
        exit 0
    fi
done

echo "AVISO: Servidor não respondeu em 30s. Verifique $LOGFILE"
echo "  tail -20 $LOGFILE"
exit 1
