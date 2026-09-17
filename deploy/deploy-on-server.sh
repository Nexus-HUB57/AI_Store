#!/usr/bin/env bash
# ─── AI Store v1.0.0 — One-Command Deploy on HostGator ───
# Execute via cPanel Terminal ou SSH:
#   bash <(curl -sL https://raw.githubusercontent.com/Nexus-HUB57/AI_Store/main/deploy/deploy-on-server.sh)
#
# Ou salve e execute:
#   curl -sL https://raw.githubusercontent.com/Nexus-HUB57/AI_Store/main/deploy/deploy-on-server.sh -o deploy.sh && bash deploy.sh

set -euo pipefail

HOME_DIR="${HOME:-/home1/luca2490}"
INSTALL_DIR="$HOME_DIR/aistore-api"
PUBLIC_HTML="$HOME_DIR/public_html"
SERVER_PORT=18446
PIDFILE="$INSTALL_DIR/server.pid"
TARBALL_URL="https://github.com/Nexus-HUB57/AI_Store/releases/download/v1.0.0/aistore-codebase.tar.gz"
TARBALL_LOCAL="$PUBLIC_HTML/aistore-codebase.tar.gz"
SESSION_SECRET_PLACEHOLDER="__SET_SESSION_SECRET_IN_GITHUB_SECRETS__"

echo "========================================"
echo "  AI Store v1.0.0 — Deploy"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"

# ── 0. Kill old process ──
echo "[0/6] Parando processo anterior..."
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null || echo "")
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$OLD_PID" 2>/dev/null || true
    echo "  Processo $OLD_PID encerrado"
  fi
  rm -f "$PIDFILE"
fi
# Kill any process on our port
if command -v fuser &>/dev/null; then
  fuser -k ${SERVER_PORT}/tcp 2>/dev/null || true
fi

# ── 1. Download tarball ──
echo "[1/6] Baixando tarball v1.0.0..."
cd "$PUBLIC_HTML"
if [ ! -f "$TARBALL_LOCAL" ] || [ "$(wc -c < "$TARBALL_LOCAL")" -lt 1000000 ]; then
  curl -sL "$TARBALL_URL" -o "$TARBALL_LOCAL"
fi
echo "  Tarball: $(du -sh "$TARBALL_LOCAL" | cut -f1)"

# ── 2. Extract ──
echo "[2/6] Extraindo codebase..."
mkdir -p "$INSTALL_DIR/standalone"
cd "$INSTALL_DIR/standalone"
rm -rf ./* ./.[!.]* 2>/dev/null || true
tar xzf "$TARBALL_LOCAL"
echo "  Extraído em $INSTALL_DIR/standalone"

# ── 3. Database ──
echo "[3/6] Configurando database..."
mkdir -p "$INSTALL_DIR/db"
SRC_DB="$INSTALL_DIR/standalone/db/custom.db"
DST_DB="$INSTALL_DIR/db/custom.db"
if [ -f "$SRC_DB" ] && [ ! -f "$DST_DB" ]; then
  cp "$SRC_DB" "$DST_DB"
  echo "  DB copiado para $DST_DB"
elif [ -f "$DST_DB" ]; then
  echo "  DB já existe em $DST_DB ($(du -sh "$DST_DB" | cut -f1))"
  cp "$DST_DB" "$SRC_DB"
fi

# ── 4. Prisma ──
echo "[4/6] Gerando Prisma client..."
NODE_DIR="$INSTALL_DIR/node-v20.18.0-linux-x64"
NODE_BIN="$NODE_DIR/bin/node"
NPX="$NODE_DIR/bin/npx"

if [ ! -f "$NODE_BIN" ]; then
  echo "  Instalando Node.js v20.18.0..."
  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  curl -sL "https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz" -o node.tar.xz
  tar xf node.tar.xz && rm node.tar.xz
  echo "  Node.js instalado"
fi

export PATH="$NODE_DIR/bin:$PATH"
export DATABASE_URL="file:$DST_DB"

PRISMA_DIR="$INSTALL_DIR/standalone/prisma"
if [ -f "$PRISMA_DIR/schema.prisma" ]; then
  cd "$INSTALL_DIR/standalone"
  npx prisma generate --datasource-provider sqlite 2>&1 | tail -1
  echo "  Prisma client gerado"
fi

# ── 5. Setup CGI ──
echo "[5/6] Configurando CGI..."
CGI_DIR="$PUBLIC_HTML"
cp "$INSTALL_DIR/standalone/hostgator/aistore-api.cgi" "$CGI_DIR/aistore-api.cgi" 2>/dev/null || true
cp "$INSTALL_DIR/standalone/hostgator/aistore-test.cgi" "$CGI_DIR/aistore-test.cgi" 2>/dev/null || true
cp "$INSTALL_DIR/standalone/hostgator/.htaccess" "$CGI_DIR/aistore/.htaccess" 2>/dev/null || true
cp "$INSTALL_DIR/standalone/hostgator/root-htaccess" "$CGI_DIR/.htaccess" 2>/dev/null || true
chmod +x "$CGI_DIR/aistore-api.cgi" "$CGI_DIR/aistore-test.cgi" 2>/dev/null || true

echo "  CGI configurado"

# ── 6. Health check ──
echo "[6/6] Verificando deploy..."
echo "  Aguardando CGI inicializar (primeira requisição pode levar 30-60s)..."
echo ""
echo "========================================"
echo "  DEPLOY CONCLUÍDO"
echo "  Acesse: https://www.mybait.org/aistore"
echo "  Health:  https://www.mybait.org/aistore/api/health"
echo "  Version: https://www.mybait.org/aistore/api/version"
echo " "
echo "  Se SESSION_SECRET não estiver configurado:"
echo "  Edite ~/public_html/.htaccess e adicione:"
echo "    SetEnv SESSION_SECRET <sua-chave-min-16-chars>"
echo "========================================"